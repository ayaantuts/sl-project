import { useEffect, useRef } from 'react';
import { on, EVENTS } from '../services/realtime/realtime';
import { getMyTokens } from '../services/api/tokenService';
import { usePreferences } from './usePreferences';
import { useNotify } from './useNotify';
import { formatShift } from '../utils/queueText';
import { ROLES } from '../config/appConfig';

/**
 * Citizen alerts, active on every page while a User is signed in:
 *  - turn called          -> snackbar + text-to-speech + vibration
 *  - position pushed back -> snackbar with the exact reason (queue transparency)
 *  - safe distance buffer -> one alert per token/service when position <= N
 */
export function useTurnAlerts(user) {
  const { t, alertUser, prefs } = usePreferences();
  const notify = useNotify();
  const safeAlerted = useRef(new Set());
  const ctx = useRef({ t, alertUser, prefs, notify });

  useEffect(() => {
    ctx.current = { t, alertUser, prefs, notify };
  });

  useEffect(() => {
    if (!user || user.role !== ROLES.USER) return undefined;

    const checkSafeDistance = async () => {
      try {
        const { tokens } = await getMyTokens();
        const { t: tr, alertUser: alert, prefs: p, notify: n } = ctx.current;
        tokens.forEach((tok) => {
          const key = `${tok._id}:${tok.currentServiceId}:${tok.rejoinCount || 0}`;
          if (tok.position && tok.position <= p.safeDistance && !safeAlerted.current.has(key)) {
            safeAlerted.current.add(key);
            const msg = tr('announce.safe', { ticket: tok.ticketNumber, n: tok.position - 1 });
            n(`${tok.ticketNumber}: ${tok.position === 1 ? tr('token.next') : tr('token.safeDistance', { n: tok.position - 1 })}`, 'warning');
            alert(msg, { haptic: false });
          }
        });
      } catch {
        /* alerts are best-effort */
      }
    };

    const offCalled = on(EVENTS.TOKEN_CALLED, (p) => {
      if (p.userRef !== user._id) return;
      const { t: tr, alertUser: alert, notify: n } = ctx.current;
      const msg = tr('announce.called', { ticket: p.ticketNumber, counter: p.counterId });
      n(msg, 'info');
      alert(msg);
    });
    const offShift = on(EVENTS.TOKEN_SHIFTED, (e) => {
      if (e.userRef !== user._id) return;
      const { t: tr, notify: n } = ctx.current;
      n(formatShift(tr, { delta: e.delta, causes: e.causes }), 'warning');
    });
    const offQueue = on(EVENTS.QUEUE_UPDATED, checkSafeDistance);
    checkSafeDistance();
    return () => {
      offCalled();
      offShift();
      offQueue();
    };
  }, [user]);
}
