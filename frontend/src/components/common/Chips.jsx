import { Chip } from '@mui/material';
import { STATUS_COLORS, TIER_COLORS, displayStatus } from '../../utils/queueText';
import { useT } from '../../hooks/usePreferences';

export function StatusChip({ token, status, size = 'small' }) {
  const t = useT();
  const s = status || displayStatus(token);
  return <Chip label={t(`status.${s}`)} color={STATUS_COLORS[s] || 'default'} size={size} />;
}

export function PriorityChip({ tier, size = 'small', showWalkIn = false }) {
  const t = useT();
  if (!tier && !showWalkIn) return null;
  return <Chip label={t(`tier.${tier || 0}`)} color={TIER_COLORS[tier || 0]} size={size} variant={tier === 3 ? 'filled' : 'outlined'} />;
}
