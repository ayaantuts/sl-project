import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, Typography } from '@mui/material';
import { getTokenEvents } from '../../services/api/tokenService';
import { useApi } from '../../hooks/useApi';
import { useT } from '../../hooks/usePreferences';
import { formatCauses, formatShift } from '../../utils/queueText';
import { formatTime } from '../../utils/format';
import { LoadingState, ErrorState } from '../common/States';

export default function ShiftReasonDialog({ token, onClose }) {
  const t = useT();
  const { data, loading, error, reload } = useApi(() => getTokenEvents(token._id), [token?._id], {
    enabled: Boolean(token),
    refreshOn: ['token:shifted'],
  });

  return (
    <Dialog open={Boolean(token)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {t('token.whyTitle')} · {token?.ticketNumber}
      </DialogTitle>
      <DialogContent dividers>
        <Typography
          sx={{
            color: "text.secondary",
            mb: 2
          }}>
          {t('token.whyIntro')}
        </Typography>
        {token?.shiftSummary && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {formatShift(t, token.shiftSummary)}
          </Alert>
        )}
        {loading && <LoadingState />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && data.events.length === 0 && <Typography>{t('token.whyNone')}</Typography>}
        {data && data.events.length > 0 && (
          <List dense disablePadding>
            {data.events.map((e) => (
              <ListItem key={e._id} divider alignItems="flex-start" disableGutters>
                <Box
                  sx={{
                    minWidth: 84,
                    whiteSpace: "nowrap",
                    pt: 0.75
                  }}>
                  <Typography variant="body2" sx={{
                    fontWeight: 600
                  }}>
                    {formatTime(e.createdAt)}
                  </Typography>
                </Box>
                <ListItemText
                  primary={`#${e.fromPosition} → #${e.toPosition} (+${e.delta})`}
                  secondary={`${formatCauses(t, e.causes)} · ${e.serviceName || ''}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
