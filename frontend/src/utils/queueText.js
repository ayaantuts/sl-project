export function formatCauses(t, causes = []) {
  const parts = causes.map((c) => t(`cause.${c.type}`, { count: c.count }));
  if (parts.length <= 1) return parts[0] || '';
  return `${parts.slice(0, -1).join(', ')} ${t('common.and')} ${parts[parts.length - 1]}`;
}

export function formatShift(t, summary) {
  if (!summary) return '';
  return t('token.shift', { delta: summary.delta, reasons: formatCauses(t, summary.causes) });
}

/** Display status: scheduled-but-not-active tokens and called tokens get their own label. */
export function displayStatus(token) {
  if (token.isUpcoming) return 'UPCOMING';
  if (token.status === 'IN_SERVICE' && token.currentStep?.status === 'CALLED') return 'CALLED';
  if (token.checkedInAt) return 'IN_SERVICE';
  return token.status;
}

export const STATUS_COLORS = {
  WAITING: 'warning',
  IN_SERVICE: 'primary',
  CALLED: 'secondary',
  COMPLETED: 'success',
  TRANSFERRED: 'info',
  MISSED: 'error',
  CANCELLED: 'default',
  UPCOMING: 'info',
  ARRIVED: 'success',
}

export const TIER_COLORS = { 0: 'default', 1: 'info', 2: 'secondary', 3: 'error' };
