import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  FormHelperText,
  Grid,
  MenuItem,
  Paper,
  Radio,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, LoadingState, EmptyState } from '../../components/common/States';
import { getPublicDomains } from '../../services/api/domainService';
import { getServices } from '../../services/api/catalogService';
import { joinQueue } from '../../services/api/tokenService';
import { getDependents } from '../../services/api/miscServices';
import { useApi } from '../../hooks/useApi';
import { useT } from '../../hooks/usePreferences';
import { useNotify } from '../../hooks/useNotify';
import { formatDuration, formatTime } from '../../utils/format';
import { SLOT_MINUTES } from '../../config/appConfig';

const DOMAIN_ICONS = {
  Healthcare: <LocalHospitalOutlinedIcon />,
  Civic: <AccountBalanceOutlinedIcon />,
  Banking: <SavingsOutlinedIcon />,
  Education: <SchoolOutlinedIcon />,
};

/** Arrival windows: next half-hour boundary (+30 min) until 23:30 today (demo-friendly closing time, see REQUIREMENT_MAPPING assumptions). */
function buildSlots(now = Date.now()) {
  const step = SLOT_MINUTES * 60000;
  const first = Math.ceil(now / step) * step + step;
  const close = new Date(now);
  close.setHours(23, 30, 0, 0);
  const slots = [];
  for (let s = first; s + step <= close.getTime(); s += step) slots.push(s);
  return slots;
}

const INITIAL = { serviceId: '', holder: 'SELF', mode: 'WALK_IN', slot: '', groupSize: 1, needsAssistance: false };

export default function JoinQueuePage() {
  const t = useT();
  const notify = useNotify();
  const [domainId, setDomainId] = useState('');
  const [form, setForm] = useState(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(null);

  const domainsQ = useApi(getPublicDomains, []);
  const dependentsQ = useApi(getDependents, []);
  const servicesQ = useApi(() => getServices({ domainId }), [domainId], { enabled: Boolean(domainId), refreshOn: ['queue:updated'] });

  const domain = domainsQ.data?.domains.find((d) => d._id === domainId);
  const settings = domain?.settings;
  const slots = useMemo(() => buildSlots(), []);
  const dependents = dependentsQ.data?.dependents || [];
  const selectedDependent = dependents.find((d) => d._id === form.holder);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const units = { min: t('common.min'), h: t('common.h') };

  const errors = {
    serviceId: !form.serviceId ? t('join.required') : '',
    slot: form.mode === 'SCHEDULED' && !form.slot ? t('join.slot') : '',
    groupSize:
      settings && (form.groupSize < 1 || form.groupSize > (settings.allowGroupBooking ? settings.maxGroupSize : 1))
        ? t('join.groupMax', { n: settings.allowGroupBooking ? settings.maxGroupSize : 1 })
        : '',
  };
  const invalid = Object.values(errors).some(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!domainId || invalid) return;
    setPending(true);
    setError(null);
    try {
      const { token } = await joinQueue({
        domainId,
        currentServiceId: form.serviceId,
        groupSize: Number(form.groupSize),
        dependentId: form.holder === 'SELF' ? undefined : form.holder,
        needsAssistance: form.needsAssistance || Boolean(selectedDependent?.isVulnerable),
        scheduledSlot: form.mode === 'SCHEDULED' ? { startTime: new Date(Number(form.slot)).toISOString() } : undefined,
      });
      setCreated(token);
      notify(t('join.success', { ticket: token.ticketNumber }));
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  if (created) {
    return (
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, textAlign: 'center', maxWidth: 560, mx: 'auto' }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 56 }} />
        <Typography variant="h5" sx={{
          mt: 1
        }}>
          {t('join.success', { ticket: '' })}
        </Typography>
        <Typography
          variant="h2"
          component="p"
          sx={{
            fontWeight: 800,
            color: "primary.main",
            my: 1,
            fontSize: { xs: '2.6rem', md: '3.6rem' }
          }}>
          {created.ticketNumber}
        </Typography>
        <Typography sx={{
          color: "text.secondary"
        }}>
          {created.domainName} · {created.serviceName}
        </Typography>
        {created.position && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              justifyContent: "center",
              mt: 2
            }}>
            <Chip label={`${t('token.position')}: #${created.position}`} color="primary" />
            <Chip label={`${t('token.eta')}: ~${formatDuration(created.estimatedWaitMins, units)}`} />
          </Stack>
        )}
        {created.isUpcoming && (
          <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
            {t('token.scheduledFor', { start: formatTime(created.scheduledSlot.startTime), end: formatTime(created.scheduledSlot.endTime) })}.{' '}
            {t('token.checkInHint')}
          </Alert>
        )}
        <Typography
          sx={{
            color: "text.secondary",
            mt: 2
          }}>
          {t('join.successBody')}
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{
            justifyContent: "center",
            mt: 3
          }}>
          <Button variant="contained" component={RouterLink} to="/my-tokens">
            {t('join.viewTokens')}
          </Button>
          <Button
            onClick={() => {
              setCreated(null);
              setForm(INITIAL);
              setSubmitted(false);
            }}
          >
            {t('join.another')}
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <>
      <PageHeader title={t('join.title')} subtitle={t('join.subtitle')} />
      {domainsQ.loading && <LoadingState label={t('common.loading')} />}
      {domainsQ.error && <ErrorState error={domainsQ.error} onRetry={domainsQ.reload} />}

      {domainsQ.data && (
        <Box component="form" noValidate onSubmit={submit}>
          {/* 1. Domain */}
          <Typography variant="h6" component="h2" sx={{
            mb: 1.5
          }}>
            1. {t('join.domain')}
          </Typography>
          {domainsQ.data.domains.length === 0 && <EmptyState title="No domains available yet." />}
          <Grid container spacing={2} sx={{
            mb: 4
          }}>
            {domainsQ.data.domains.map((d) => (
              <Grid key={d._id} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%', borderColor: domainId === d._id ? 'primary.main' : undefined, borderWidth: domainId === d._id ? 2 : 1 }}>
                  <CardActionArea
                    sx={{ height: '100%' }}
                    onClick={() => {
                      setDomainId(d._id);
                      setForm(INITIAL);
                      setSubmitted(false);
                      setError(null);
                    }}
                    aria-pressed={domainId === d._id}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          color: "primary.main",
                          mb: 1
                        }}>
                        {DOMAIN_ICONS[d.type] || <StorefrontOutlinedIcon />}
                      </Box>
                      <Typography sx={{
                        fontWeight: 600
                      }}>{d.name}</Typography>
                      <Typography variant="body2" sx={{
                        color: "text.secondary"
                      }}>
                        {d.type}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {domain && (
            <>
              {/* 2. Service */}
              <Typography variant="h6" component="h2" sx={{
                mb: 1.5
              }}>
                2. {t('join.service')}
              </Typography>
              {servicesQ.loading && !servicesQ.data && <LoadingState rows={2} />}
              {servicesQ.error && <ErrorState error={servicesQ.error} onRetry={servicesQ.reload} />}
              <Stack spacing={1.25} role="radiogroup" aria-label={t('join.service')} sx={{
                mb: 1
              }}>
                {(servicesQ.data?.services || []).map((s) => (
                  <Card key={s._id} sx={{ borderColor: form.serviceId === s._id ? 'primary.main' : undefined, opacity: s.isActive ? 1 : 0.55 }}>
                    <CardActionArea disabled={!s.isActive} onClick={() => set({ serviceId: s._id })}>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{
                          alignItems: "center",
                          p: 1.5
                        }}>
                        <Radio checked={form.serviceId === s._id} tabIndex={-1} disabled={!s.isActive} slotProps={{ input: { 'aria-label': s.name } }} />
                        <Box
                          sx={{
                            flexGrow: 1,
                            minWidth: 0
                          }}>
                          <Typography sx={{
                            fontWeight: 600
                          }}>{s.name}</Typography>
                          <Typography variant="body2" sx={{
                            color: "text.secondary"
                          }}>
                            {s.isActive
                              ? t('join.waitingNow', { n: s.waitingCount, eta: formatDuration(s.estimatedWaitMins, units) })
                              : t('join.inactive')}
                          </Typography>
                        </Box>
                        <Chip label={s.prefix} size="small" variant="outlined" />
                      </Stack>
                    </CardActionArea>
                  </Card>
                ))}
              </Stack>
              {submitted && errors.serviceId && <FormHelperText error>{errors.serviceId}</FormHelperText>}

              {/* 3. Details */}
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  mt: 4,
                  mb: 1.5
                }}>
                3. {t('join.forWhom')}
              </Typography>
              <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label={t('join.forWhom')}
                      value={form.holder}
                      onChange={(e) => {
                        const dep = dependents.find((d) => d._id === e.target.value);
                        set({ holder: e.target.value, needsAssistance: dep ? dep.isVulnerable : false });
                      }}
                      helperText={
                        <RouterLink to="/dependents" style={{ color: 'inherit' }}>
                          {t('nav.dependents')}
                        </RouterLink>
                      }
                    >
                      <MenuItem value="SELF">{t('join.myself')}</MenuItem>
                      {dependents.map((d) => (
                        <MenuItem key={d._id} value={d._id}>
                          {d.name} ({t(`relation.${d.relation}`)})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      type="number"
                      fullWidth
                      label={t('join.groupSize')}
                      value={form.groupSize}
                      onChange={(e) => set({ groupSize: e.target.value === '' ? '' : Number(e.target.value) })}
                      disabled={!settings.allowGroupBooking}
                      error={submitted && Boolean(errors.groupSize)}
                      helperText={settings.allowGroupBooking ? t('join.groupMax', { n: settings.maxGroupSize }) : t('join.groupNotAllowed')}
                      slotProps={{ htmlInput: { min: 1, max: settings.allowGroupBooking ? settings.maxGroupSize : 1 } }}
                    />
                  </Grid>
                  <Grid size={12}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        mb: 1
                      }}>
                      {t('join.visitType')}
                    </Typography>
                    <ToggleButtonGroup
                      exclusive
                      color="primary"
                      value={form.mode}
                      onChange={(_, v) => v && set({ mode: v, slot: '' })}
                      sx={{ flexWrap: 'wrap' }}
                    >
                      <ToggleButton value="WALK_IN">{t('join.walkIn')}</ToggleButton>
                      <ToggleButton value="SCHEDULED">{t('join.scheduled')}</ToggleButton>
                    </ToggleButtonGroup>
                  </Grid>
                  {form.mode === 'SCHEDULED' && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      {slots.length === 0 ? (
                        <Alert severity="warning">{t('join.noSlots')}</Alert>
                      ) : (
                        <TextField
                          select
                          fullWidth
                          label={t('join.slot')}
                          value={form.slot}
                          onChange={(e) => set({ slot: e.target.value })}
                          error={submitted && Boolean(errors.slot)}
                          helperText={t('token.checkInHint')}
                        >
                          {slots.map((s) => (
                            <MenuItem key={s} value={String(s)}>
                              {formatTime(s)} – {formatTime(s + SLOT_MINUTES * 60000)}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    </Grid>
                  )}
                  <Grid size={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.needsAssistance || Boolean(selectedDependent?.isVulnerable)}
                          disabled={Boolean(selectedDependent?.isVulnerable)}
                          onChange={(e) => set({ needsAssistance: e.target.checked })}
                        />
                      }
                      label={t('join.assistance')}
                    />
                    <FormHelperText sx={{ mt: -0.5, ml: 4 }}>{t('join.assistanceHint')}</FormHelperText>
                  </Grid>
                </Grid>
              </Paper>

              {error && (
                <Alert severity="error" sx={{ mt: 3 }}>
                  {error}
                </Alert>
              )}
              <Box
                sx={{
                  mt: 3,
                  display: "flex",
                  justifyContent: "flex-end"
                }}>
                <Button type="submit" variant="contained" size="large" loading={pending} sx={{ minWidth: 200 }}>
                  {t('join.submit')}
                </Button>
              </Box>
            </>
          )}
        </Box>
      )}
    </>
  );
}
