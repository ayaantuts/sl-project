import { useCallback, useEffect, useRef, useState } from 'react';
import { on } from '../services/realtime/realtime';

export function useApi(fetcher, deps = [], { refreshOn = [], enabled = true, intervalMs = 0 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const fetcherRef = useRef(fetcher);
  const requestId = useRef(0);
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const run = useCallback(
    async ({ silent = false } = {}) => {
      if (!enabled) return;
      const id = ++requestId.current;
      if (!silent) setLoading(true);
      try {
        const result = await fetcherRef.current();
        if (id === requestId.current) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (id === requestId.current) setError(err);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [enabled, depsKey],
  );

  useEffect(() => {
    if (enabled) run();
  }, [run, enabled]);

  const refreshKey = refreshOn.join('|');
  useEffect(() => {
    if (!enabled || !refreshKey) return undefined;
    const offs = refreshKey.split('|').map((evt) => on(evt, () => run({ silent: true })));
    return () => offs.forEach((off) => off());
  }, [refreshKey, run, enabled]);

  useEffect(() => {
    if (!enabled || !intervalMs) return undefined;
    const id = setInterval(() => run({ silent: true }), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, run, enabled]);

  return { data: enabled ? data : null, error: enabled ? error : null, loading: enabled && loading, reload: run, setData };
}

/** Wraps an async action with a pending flag + success/error notification. */
export function useAction(notify) {
  const [pending, setPending] = useState(null);
  const runAction = useCallback(
    async (key, fn, successMessage) => {
      setPending(key);
      try {
        const result = await fn();
        if (successMessage) notify?.(typeof successMessage === 'function' ? successMessage(result) : successMessage, 'success');
        return result;
      } catch (err) {
        notify?.(err.message || 'Something went wrong', 'error');
        return undefined;
      } finally {
        setPending(null);
      }
    },
    [notify],
  );
  return { pending, runAction };
}

/** Re-render every `ms` (for countdowns / "x min ago"). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
