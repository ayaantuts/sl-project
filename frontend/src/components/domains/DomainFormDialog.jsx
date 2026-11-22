import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { BLUEPRINTS, DOMAIN_TYPES } from '../../blueprints';
import { createDomain, updateDomain } from '../../services/api/domainService';
import { createService, getServices } from '../../services/api/catalogService';

const DEFAULT_SETTINGS = { allowGroupBooking: true, noShowTimeoutMins: 5, maxGroupSize: 5 };

/** Pick a 2-4 letter prefix that no existing service uses (ticket numbers must stay unique). */
function uniquePrefix(prefix, taken) {
  if (!taken.has(prefix)) return prefix;
  for (let c = 65; c <= 90; c += 1) {
    const candidate = `${prefix.slice(0, 2)}${String.fromCharCode(c)}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${prefix.slice(0, 2)}ZZ`;
}

/**
 * Create (optionally from a domain blueprint) or edit a domain.
 * Payload follows backend/src/models/Domain.js. `moderators` = users with role Moderator.
 */
export default function DomainFormDialog({ open, domain, moderators, onClose, onSaved }) {
  const editing = Boolean(domain);
  const [blueprintKey, setBlueprintKey] = useState('');
  const [form, setForm] = useState(() =>
    domain
      ? { name: domain.name, type: domain.type, moderatorRef: domain.moderatorRef, settings: { ...DEFAULT_SETTINGS, ...domain.settings } }
      : { name: '', type: '', moderatorRef: '', settings: { ...DEFAULT_SETTINGS } },
  );
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const blueprint = BLUEPRINTS.find((b) => b.key === blueprintKey);
  const typeOptions = [...new Set([...DOMAIN_TYPES, form.type].filter(Boolean))];
  const s = form.settings;

  const errors = {
    name: !form.name.trim() ? 'Name is required' : '',
    type: !form.type ? 'Type is required' : '',
    moderatorRef: !form.moderatorRef ? 'Assign a moderator' : '',
    maxGroupSize: !(Number.isInteger(s.maxGroupSize) && s.maxGroupSize >= 1 && s.maxGroupSize <= 20) ? '1 to 20' : '',
    noShowTimeoutMins: !(Number.isInteger(s.noShowTimeoutMins) && s.noShowTimeoutMins >= 1 && s.noShowTimeoutMins <= 60) ? '1 to 60 minutes' : '',
  };
  const invalid = Object.values(errors).some(Boolean);

  const chooseBlueprint = (bp) => {
    setBlueprintKey(bp?.key || '');
    setForm((f) => ({
      ...f,
      type: bp ? bp.domain.type : f.type,
      settings: bp ? { ...bp.domain.settings } : { ...DEFAULT_SETTINGS },
    }));
  };

  const setSetting = (key, value) => setForm((f) => ({ ...f, settings: { ...f.settings, [key]: value } }));

  const submit = async () => {
    setTouched(true);
    if (invalid) return;
    setPending(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      moderatorRef: form.moderatorRef,
      settings: { ...s, maxGroupSize: s.allowGroupBooking ? s.maxGroupSize : 1 },
    };
    try {
      if (editing) {
        const { domain: updated } = await updateDomain(domain._id, payload);
        onSaved(updated, 'Domain updated');
      } else {
        const { domain: created } = await createDomain(payload);
        let note = 'Domain created';
        if (blueprint) {
          const { services } = await getServices({ domainId: created._id });
          const taken = new Set(services.map((x) => x.prefix));
          for (const svc of blueprint.services) {
            const prefix = uniquePrefix(svc.prefix, taken);
            taken.add(prefix);
            await createService({ ...svc, prefix, domainId: created._id });
          }
          note = `Domain created with ${blueprint.services.length} services from the ${blueprint.domain.type} blueprint`;
        }
        onSaved(created, note);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{editing ? `Edit ${domain.name}` : 'New domain'}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {!editing && (
          <Box sx={{
            mb: 3
          }}>
            <Typography variant="subtitle2" gutterBottom>
              Start from a blueprint (pre-configured rules and service chain)
            </Typography>
            <Grid container spacing={1.5}>
              {[null, ...BLUEPRINTS].map((bp) => {
                const selected = (bp?.key || '') === blueprintKey;
                return (
                  <Grid key={bp?.key || 'blank'} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card sx={{ height: '100%', borderColor: selected ? 'primary.main' : undefined, borderWidth: selected ? 2 : 1 }}>
                      <CardActionArea sx={{ height: '100%' }} onClick={() => chooseBlueprint(bp)} aria-pressed={selected}>
                        <CardContent>
                          <Typography sx={{
                            fontWeight: 600
                          }}>{bp ? bp.label : 'Blank domain'}</Typography>
                          <Typography variant="body2" sx={{
                            color: "text.secondary"
                          }}>
                            {bp ? bp.description : 'Configure everything yourself.'}
                          </Typography>
                          {bp && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: "text.secondary",
                                display: "block",
                                mt: 1
                              }}>
                              {bp.services.map((x) => x.name).join(' → ')}
                            </Typography>
                          )}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Domain name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={touched && Boolean(errors.name)}
              helperText={touched && errors.name}
              fullWidth
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              error={touched && Boolean(errors.type)}
              helperText={touched && errors.type}
              fullWidth
              required
            >
              {typeOptions.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              label="Moderator"
              value={moderators.some((m) => m._id === form.moderatorRef) ? form.moderatorRef : ''}
              onChange={(e) => setForm({ ...form, moderatorRef: e.target.value })}
              error={touched && Boolean(errors.moderatorRef)}
              helperText={(touched && errors.moderatorRef) || (moderators.length === 0 ? 'Create a Moderator account first (Users page)' : '')}
              fullWidth
              required
            >
              {moderators.map((m) => (
                <MenuItem key={m._id} value={m._id}>
                  {m.name} ({m.email})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              type="number"
              label="No-show timeout (minutes)"
              value={s.noShowTimeoutMins}
              onChange={(e) => setSetting('noShowTimeoutMins', Number(e.target.value))}
              error={touched && Boolean(errors.noShowTimeoutMins)}
              helperText={(touched && errors.noShowTimeoutMins) || 'Called tokens are marked missed after this time'}
              slotProps={{ htmlInput: { min: 1, max: 60 } }}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControlLabel
              control={<Switch checked={s.allowGroupBooking} onChange={(e) => setSetting('allowGroupBooking', e.target.checked)} />}
              label="Allow group bookings"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              type="number"
              label="Maximum group size"
              value={s.allowGroupBooking ? s.maxGroupSize : 1}
              disabled={!s.allowGroupBooking}
              onChange={(e) => setSetting('maxGroupSize', Number(e.target.value))}
              error={touched && s.allowGroupBooking && Boolean(errors.maxGroupSize)}
              helperText={touched && s.allowGroupBooking && errors.maxGroupSize}
              slotProps={{ htmlInput: { min: 1, max: 20 } }}
              fullWidth
            />
          </Grid>
        </Grid>
        {blueprint && (
          <Stack sx={{
            mt: 2
          }}>
            <Alert severity="info">
              {blueprint.services.length} services will be created: {blueprint.services.map((x) => `${x.name} (${x.prefix})`).join(', ')}.
            </Alert>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} loading={pending}>
          {editing ? 'Save changes' : 'Create domain'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
