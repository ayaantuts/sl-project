import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import { createService, updateService } from '../../services/api/catalogService';

/** Create / edit a Service (backend/src/models/Service.js). */
export default function ServiceFormDialog({ open, domainId, service, onClose, onSaved }) {
  const editing = Boolean(service);
  const [form, setForm] = useState(() =>
    service
      ? { name: service.name, prefix: service.prefix, avgHandleTimeMins: service.avgHandleTimeMins, isActive: service.isActive }
      : { name: '', prefix: '', avgHandleTimeMins: 5, isActive: true },
  );
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const errors = {
    name: !form.name.trim() ? 'Name is required' : '',
    prefix: !/^[A-Z]{2,4}$/.test(form.prefix) ? '2-4 capital letters, used in ticket numbers (e.g. DOC-001)' : '',
    avgHandleTimeMins: !(Number(form.avgHandleTimeMins) > 0 && Number(form.avgHandleTimeMins) <= 240) ? '1 to 240 minutes' : '',
  };
  const invalid = Object.values(errors).some(Boolean);

  const submit = async () => {
    setTouched(true);
    if (invalid) return;
    setPending(true);
    setError(null);
    const payload = { ...form, name: form.name.trim(), avgHandleTimeMins: Number(form.avgHandleTimeMins) };
    try {
      const { service: saved } = editing ? await updateService(service._id, payload) : await createService({ ...payload, domainId });
      onSaved(saved, editing ? 'Service updated' : 'Service created');
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{editing ? `Edit ${service.name}` : 'New service'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{
          mt: 1
        }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Service name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={touched && Boolean(errors.name)}
            helperText={touched && errors.name}
            autoFocus
            fullWidth
            required
          />
          <TextField
            label="Ticket prefix"
            value={form.prefix}
            onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) })}
            error={touched && Boolean(errors.prefix)}
            helperText={(touched && errors.prefix) || 'Shown on tickets, e.g. DOC-012'}
            fullWidth
            required
          />
          <TextField
            type="number"
            label="Average handle time (minutes)"
            value={form.avgHandleTimeMins}
            onChange={(e) => setForm({ ...form, avgHandleTimeMins: e.target.value })}
            error={touched && Boolean(errors.avgHandleTimeMins)}
            helperText={(touched && errors.avgHandleTimeMins) || 'Used to estimate wait times'}
            slotProps={{ htmlInput: { min: 1, max: 240 } }}
            fullWidth
          />
          <FormControlLabel control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />} label="Accepting tokens" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} loading={pending}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
