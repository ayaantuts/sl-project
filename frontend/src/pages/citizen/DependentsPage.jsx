import { useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import AccessibleIcon from '@mui/icons-material/Accessible';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States';
import { getDependents, createDependent, deleteDependent } from '../../services/api/miscServices';
import { useApi, useAction } from '../../hooks/useApi';
import { useT } from '../../hooks/usePreferences';
import { useNotify } from '../../hooks/useNotify';
import { initials } from '../../utils/format';

const RELATIONS = ['Parent', 'Child', 'Spouse', 'Sibling', 'Grandparent', 'Other'];
const EMPTY = { name: '', relation: 'Parent', age: '', isVulnerable: false };

/** Guardian management: one account holds and monitors tokens for family members. */
export default function DependentsPage() {
  const t = useT();
  const notify = useNotify();
  const { data, loading, error, reload } = useApi(getDependents, [], { refreshOn: ['token:updated'] });
  const { pending, runAction } = useAction(notify);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const ageNum = form.age === '' ? null : Number(form.age);
  const errors = {
    name: !form.name.trim() ? 'Name is required' : '',
    age: ageNum != null && !(Number.isInteger(ageNum) && ageNum >= 0 && ageNum <= 120) ? 'Age must be between 0 and 120' : '',
  };

  const save = async () => {
    setTouched(true);
    if (errors.name || errors.age) return;
    setFormError(null);
    setSaving(true);
    try {
      await createDependent({ ...form, name: form.name.trim(), age: ageNum });
      notify(`${form.name.trim()} ✓`);
      setOpen(false);
      setForm(EMPTY);
      setTouched(false);
      reload({ silent: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('dependents.title')}
        subtitle={t('dependents.subtitle')}
        actions={
          <Button variant="contained" startIcon={<PersonAddAlt1Icon />} onClick={() => setOpen(true)}>
            {t('dependents.add')}
          </Button>
        }
      />
      {loading && <LoadingState rows={2} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.dependents.length === 0 && (
        <EmptyState
          title={t('dependents.empty')}
          action={
            <Button variant="contained" onClick={() => setOpen(true)} startIcon={<PersonAddAlt1Icon />}>
              {t('dependents.add')}
            </Button>
          }
        />
      )}
      {data && data.dependents.length > 0 && (
        <Grid container spacing={2}>
          {data.dependents.map((d) => (
            <Grid key={d._id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      alignItems: "center",
                      mb: 1.5
                    }}>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>{initials(d.name)}</Avatar>
                    <div>
                      <Typography sx={{
                        fontWeight: 600
                      }}>{d.name}</Typography>
                      <Typography variant="body2" sx={{
                        color: "text.secondary"
                      }}>
                        {t(`relation.${d.relation}`)}
                        {d.age != null ? ` · ${t('dependents.age')} ${d.age}` : ''}
                      </Typography>
                    </div>
                  </Stack>
                  {d.isVulnerable && <Chip icon={<AccessibleIcon />} label={t('tier.2')} color="secondary" size="small" variant="outlined" sx={{ mb: 1 }} />}
                  {/* <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>
                    {t('dependents.activeTokens')}: {d.activeTokens.length ? d.activeTokens.join(', ') : '-'}
                  </Typography> */}
                </CardContent>
                <CardActions>
                  <Button color="error" size="small" startIcon={<DeleteOutlineIcon />} onClick={() => setRemoveTarget(d)}>
                    {t('dependents.remove')}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('dependents.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{
            mt: 1
          }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label={t('dependents.name')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={touched && Boolean(errors.name)}
              helperText={touched && errors.name}
              autoFocus
              fullWidth
            />
            <TextField select label={t('dependents.relation')} value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} fullWidth>
              {RELATIONS.map((r) => (
                <MenuItem key={r} value={r}>
                  {t(`relation.${r}`)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('dependents.age')}
              type="number"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              error={touched && Boolean(errors.age)}
              helperText={touched && errors.age}
              slotProps={{ htmlInput: { min: 0, max: 120 } }}
              fullWidth
            />
            <FormControlLabel
              control={<Checkbox checked={form.isVulnerable} onChange={(e) => setForm({ ...form, isVulnerable: e.target.checked })} />}
              label={t('dependents.vulnerable')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={save} loading={saving}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={t('dependents.remove')}
        message={removeTarget ? t('dependents.removeConfirm', { name: removeTarget.name }) : ''}
        confirmLabel={t('dependents.remove')}
        cancelLabel={t('common.cancel')}
        danger
        pending={pending === 'remove'}
        onClose={() => setRemoveTarget(null)}
        onConfirm={async () => {
          const res = await runAction('remove', () => deleteDependent(removeTarget._id), `${removeTarget.name} ✓`);
          setRemoveTarget(null);
          if (res) reload({ silent: true });
        }}
      />
    </>
  );
}
