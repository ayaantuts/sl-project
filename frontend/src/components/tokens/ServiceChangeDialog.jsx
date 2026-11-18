import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { getServices } from '../../services/api/catalogService';
import { requestServiceChange } from '../../services/api/tokenService';
import { useApi } from '../../hooks/useApi';
import { useT } from '../../hooks/usePreferences';
import { useNotify } from '../../hooks/useNotify';

/** Service switching: citizen asks staff to move the token to another service of the same domain. */
export default function ServiceChangeDialog({ token, onClose, onDone }) {
  const t = useT();
  const notify = useNotify();
  const [toServiceId, setToServiceId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const { data } = useApi(() => getServices({ domainId: token.domainId }), [token?.domainId], { enabled: Boolean(token) });

  const options = (data?.services || []).filter((s) => s._id !== token?.currentServiceId && s.isActive);

  const submit = async () => {
    if (!toServiceId) {
      setError(t('join.required'));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await requestServiceChange(token._id, { toServiceId, reason });
      notify(t('token.pendingChange', { service: options.find((o) => o._id === toServiceId)?.name }), 'info');
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={Boolean(token)} onClose={pending ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {t('token.changeService')} · {token?.ticketNumber}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{
          mt: 1
        }}>
          <Alert severity="info">{t('token.changeHint')}</Alert>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField select label={t('token.newService')} value={toServiceId} onChange={(e) => setToServiceId(e.target.value)} fullWidth>
            {options.map((s) => (
              <MenuItem key={s._id} value={s._id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('token.reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>
          {t('common.cancel')}
        </Button>
        <Button variant="contained" onClick={submit} loading={pending}>
          {t('token.requestChange')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
