import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, LoadingState } from '../../components/common/States';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import TokenDashboard from '../../components/tokens/TokenDashboard';
import ShiftReasonDialog from '../../components/tokens/ShiftReasonDialog';
import ServiceChangeDialog from '../../components/tokens/ServiceChangeDialog';
import { getMyTokens, cancelToken, rejoinQueue, checkIn } from '../../services/api/tokenService';
import { EVENTS } from '../../services/realtime/realtime';
import { useApi, useAction } from '../../hooks/useApi';
import { useT } from '../../hooks/usePreferences';
import { useNotify } from '../../hooks/useNotify';
import { formatTime } from '../../utils/format';

const LIVE_EVENTS = [EVENTS.QUEUE_UPDATED, EVENTS.TOKEN_UPDATED, EVENTS.TOKEN_SHIFTED, EVENTS.TOKEN_CALLED];

export default function MyTokensPage() {
  const t = useT();
  const notify = useNotify();
  const { data, loading, error, reload } = useApi(getMyTokens, [], { refreshOn: LIVE_EVENTS, intervalMs: 30000 });
  const { pending, runAction } = useAction(notify);
  const [whyToken, setWhyToken] = useState(null);
  const [changeToken, setChangeToken] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const act = async (key, token, fn, message) => {
    const res = await runAction(`${key}:${token._id}`, fn, message);
    if (res) reload({ silent: true });
    return res;
  };

  const actions = {
    onWhy: setWhyToken,
    onChangeService: setChangeToken,
    onCancel: setCancelTarget,
    onRejoin: (tok) => act('rejoin', tok, () => rejoinQueue(tok._id), (r) => t('token.rejoined', { ticket: r.token.ticketNumber, n: r.token.position ?? '-' })),
    onCheckIn: (tok) =>
      act('checkIn', tok, () => checkIn(tok._id), (r) => t('token.checkedIn', { start: formatTime(r.token.scheduledSlot?.startTime || r.token.queuedAt) })),
    onShare: async (tok) => {
      const url = `${window.location.origin}/track/${tok.ticketNumber}`;
      try {
        if (navigator.share) {
          await navigator.share({ title: `WaitLess ${tok.ticketNumber}`, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        notify(t('token.copied'), 'info');
      } catch {
        notify(url, 'info');
      }
    },
  };

  return (
    <>
      <PageHeader
        title={t('myTokens.title')}
        subtitle={t('myTokens.subtitle')}
        actions={
          <>
            <Button startIcon={<RefreshIcon />} onClick={() => reload()}>
              {t('common.refresh')}
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/join">
              {t('nav.joinQueue')}
            </Button>
          </>
        }
      />
      {loading && !data && <LoadingState label={t('common.loading')} rows={3} />}
      {error && <ErrorState error={error} onRetry={reload} retryLabel={t('common.retry')} />}
      {data && (
        <TokenDashboard
          tokens={data.tokens}
          actions={actions}
          pending={pending}
          emptyAction={
            <Button variant="contained" component={RouterLink} to="/join" startIcon={<AddIcon />}>
              {t('nav.joinQueue')}
            </Button>
          }
        />
      )}

      {whyToken && <ShiftReasonDialog token={whyToken} onClose={() => setWhyToken(null)} />}
      {changeToken && <ServiceChangeDialog token={changeToken} onClose={() => setChangeToken(null)} onDone={() => reload({ silent: true })} />}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title={t('token.cancel')}
        message={cancelTarget ? t('token.cancelConfirm', { ticket: cancelTarget.ticketNumber }) : ''}
        confirmLabel={t('token.cancel')}
        cancelLabel={t('common.close')}
        danger
        pending={pending === `cancel:${cancelTarget?._id}`}
        onClose={() => setCancelTarget(null)}
        onConfirm={async () => {
          await act('cancel', cancelTarget, () => cancelToken(cancelTarget._id), t('token.cancelledBody'));
          setCancelTarget(null);
        }}
      />
    </>
  );
}
