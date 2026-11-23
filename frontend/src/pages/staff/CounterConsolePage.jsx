import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import CheckIcon from '@mui/icons-material/Check';
import EastIcon from '@mui/icons-material/East';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ElderlyIcon from '@mui/icons-material/Elderly';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import PageHeader from '../../components/common/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States';
import { PriorityChip } from '../../components/common/Chips';
import WorkflowStepper from '../../components/tokens/WorkflowStepper';
import { getDomains } from '../../services/api/domainService';
import { getServices } from '../../services/api/catalogService';
import {
  getQueue,
  callNext,
  markArrived,
  completeToken,
  transferToken,
  markNoShow,
  setPriority,
  getServiceChangeRequests,
  decideServiceChange,
} from '../../services/api/counterService';
import { EVENTS } from '../../services/realtime/realtime';
import { useApi, useAction, useNow } from '../../hooks/useApi';
import { useNotify } from '../../hooks/useNotify';
import { usePreferences } from '../../hooks/usePreferences';
import { storage } from '../../utils/storage';
import { formatCountdown, formatDuration, formatTime, minutesSince } from '../../utils/format';
import { workflowNamesForType } from '../../blueprints';
import { COUNTERS_PER_SERVICE, STORAGE_KEYS } from '../../config/appConfig';

const LIVE = [EVENTS.QUEUE_UPDATED, EVENTS.TOKEN_UPDATED, EVENTS.TOKEN_SHIFTED];
const COUNTERS = Array.from({ length: COUNTERS_PER_SERVICE }, (_, i) => `Counter ${i + 1}`);

function NoShowTimer({ startTime, timeoutMins }) {
  const now = useNow(1000);
  const left = Math.max(0, timeoutMins * 60000 - (now - new Date(startTime).getTime()));
  const pct = Math.max(0, Math.min(100, (left / (timeoutMins * 60000)) * 100));
  return (
    <Box>
      <Stack direction="row" sx={{
        justifyContent: "space-between"
      }}>
        <Typography variant="body2">No-show timer</Typography>
        <Typography variant="body2" color={left < 60000 ? 'error.main' : 'text.primary'} sx={{
          fontWeight: 700
        }}>
          {formatCountdown(left)}
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct} color={left < 60000 ? 'error' : 'primary'} sx={{ height: 8, borderRadius: 4, mt: 0.5 }} />
    </Box>
  );
}

function Elapsed({ since }) {
  useNow(15000);
  return <>{formatDuration(minutesSince(since))}</>;
}

export default function CounterConsolePage() {
  const notify = useNotify();
  const { speakText } = usePreferences();
  const saved = storage.get(STORAGE_KEYS.console, {});
  const [domainChoice, setDomainId] = useState(saved.domainId || '');
  const [serviceChoice, setServiceId] = useState(saved.serviceId || '');
  const [counterId, setCounterId] = useState(saved.counterId || COUNTERS[0]);
  const { pending, runAction } = useAction(notify);
  const [menu, setMenu] = useState(null); // { anchor, token }
  const [priorityDialog, setPriorityDialog] = useState(null); // { token, tier }
  const [transferOpen, setTransferOpen] = useState(false);
  const [transfer, setTransfer] = useState({ nextServiceId: '', token: null, notes: '' });

  const domainsQ = useApi(getDomains, []);
  const domains = useMemo(() => domainsQ.data?.domains || [], [domainsQ.data]);
  const domainId = domains.some((d) => d._id === domainChoice) ? domainChoice : domains[0]?._id || '';
  const domain = domains.find((d) => d._id === domainId);
  const servicesQ = useApi(() => getServices({ domainId }), [domainId], { enabled: Boolean(domain), refreshOn: LIVE });
  const services = useMemo(() => servicesQ.data?.services || [], [servicesQ.data]);
  const serviceId = services.some((sv) => sv._id === serviceChoice) ? serviceChoice : services[0]?._id || '';
  const queueQ = useApi(() => getQueue(serviceId), [serviceId], {
    enabled: Boolean(serviceId) && services.some((s) => s._id === serviceId),
    refreshOn: LIVE,
  });
  const requestsQ = useApi(() => getServiceChangeRequests(domainId), [domainId], { enabled: Boolean(domain), refreshOn: LIVE });

  useEffect(() => {
    storage.set(STORAGE_KEYS.console, { domainId, serviceId, counterId });
  }, [domainId, serviceId, counterId]);

  const queue = queueQ.data;
  const current = queue?.serving.find((tok) => tok.workflowHistory.filter((step) => step.counterId === counterId)) || null;
  const otherCounters = queue?.serving.filter((tok) => tok !== current) || [];
  const service = services.find((s) => s._id === serviceId);

  const suggestedNext = useMemo(() => {
    if (!service) return '';
    const byOrder = services.find((s) => s.order === service.order + 1 && s.isActive);
    return (byOrder || services.find((s) => s._id !== service._id && s.isActive))?._id || '';
  }, [service, services, domain]);

  const act = async (key, fn, msg) => {
    const res = await runAction(key, fn, msg);
    if (res) queueQ.reload({ silent: true });
    return res;
  };

  const doCallNext = async () => {
    const res = await act('call', () => callNext(serviceId, counterId), (r) => `Called ${r.token.ticketNumber} to ${counterId}`);
    if (res) speakText(`Token ${res.token.ticketNumber}, please proceed to ${counterId}.`);
  };

  const openTransfer = () => {
    setTransfer({ nextServiceId: suggestedNext, notes: '' });
    setTransferOpen(true);
  };

  return (
    <>
      <PageHeader title="Counter Console" subtitle="Call, serve and route tokens through multi-step journeys." />

      {domainsQ.loading && <LoadingState />}
      {domainsQ.error && <ErrorState error={domainsQ.error} onRetry={domainsQ.reload} />}
      {domainsQ.data && domains.length === 0 && (
        <EmptyState title="No domains assigned to you" description="Ask an administrator to assign you as moderator of a domain." />
      )}

      {domains.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField select fullWidth size="small" label="Domain" value={domains.some((d) => d._id === domainId) ? domainId : ''} onChange={(e) => setDomainId(e.target.value)}>
                {domains.map((d) => (
                  <MenuItem key={d._id} value={d._id}>
                    {d.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 7, md: 4 }}>
              <TextField select fullWidth size="small" label="Service" value={services.some((s) => s._id === serviceId) ? serviceId : ''} onChange={(e) => setServiceId(e.target.value)}>
                {services.map((s) => (
                  <MenuItem key={s._id} value={s._id} disabled={!s.isActive}>
                    {s.name} ({s.waitingCount} waiting){s.isActive ? '' : ' - inactive'}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 5, md: 3 }}>
              <TextField select fullWidth size="small" label="My counter" value={counterId} onChange={(e) => setCounterId(e.target.value)}>
                {COUNTERS.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Paper>
      )}

      {queueQ.error && <ErrorState error={queueQ.error} onRetry={queueQ.reload} />}
      {queueQ.loading && !queue && serviceId && <LoadingState rows={3} />}

      {queue && (
        <Grid container spacing={3}>
          {/* ---------------- Now serving at my counter */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ mb: 3 }}>
              <CardHeader title={`${counterId} · ${queue.service.name}`} subheader="Now serving" />
              <CardContent sx={{ pt: 0 }}>
                {!current ? (
                  <Stack
                    spacing={2}
                    sx={{
                      alignItems: "stretch",
                      textAlign: "center",
                      py: 2
                    }}>
                    <Typography sx={{
                      color: "text.secondary"
                    }}>Counter is free.</Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<CampaignIcon />}
                      onClick={doCallNext}
                      loading={pending === 'call'}
                      disabled={queue.waiting.length === 0 || !queue.service.isActive}
                      sx={{ py: 1.5 }}
                    >
                      {queue.waiting.length ? `Call next (${queue.waiting[0].ticketNumber})` : 'Queue is empty'}
                    </Button>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <Box>
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        sx={{
                          alignItems: "center",
                          flexWrap: "wrap"
                        }}>
                        <Typography variant="h3" component="p" sx={{
                          fontWeight: 800
                        }}>
                          {current.ticketNumber}
                        </Typography>
                        {current.stepNumber > 1 && <Chip size="small" label={`Step ${current.stepNumber}`} />}
                        <PriorityChip tier={current.priorityTier} />
                        {current.groupSize > 1 && <Chip size="small" variant="outlined" label={`Group of ${current.groupSize}`} />}
                      </Stack>
                      <Typography sx={{
                        color: "text.secondary"
                      }}>
                        {current.holderName}
                        {current.holderType === 'DEPENDENT' ? ` (${current.holderRelation}, via guardian)` : ''}
                      </Typography>
                    </Box>

                    {current.workflowHistory.at(-1).status === 'CALLED' ? (
                      <>
                        <Alert severity="warning" icon={<CampaignIcon />}>
                          Called at {formatTime(current.workflowHistory.at(-1).startedAt)}. Waiting for the visitor to arrive.
                        </Alert>
                        <NoShowTimer startTime={current.workflowHistory.at(-1).startedAt} timeoutMins={domain.settings.noShowTimeoutMins} />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                          <Button variant="contained" startIcon={<HowToRegIcon />} onClick={() => act('arrived', () => markArrived(current._id), 'Arrival confirmed')} loading={pending === 'arrived'} fullWidth>
                            Visitor arrived
                          </Button>
                          <Button color="error" variant="outlined" startIcon={<PersonOffIcon />} onClick={() => act('noshow', () => markNoShow(current._id), `${current.ticketNumber} marked as no-show`)} loading={pending === 'noshow'} fullWidth>
                            No-show
                          </Button>
                        </Stack>
                        <Button startIcon={<RecordVoiceOverIcon />} onClick={() => speakText(`Token ${current.ticketNumber}, please proceed to ${counterId}.`)}>
                          Repeat announcement
                        </Button>
                      </>
                    ) : (
                      <>
                        <Alert severity="info">
                          In service for <Elapsed since={current.workflowHistory.at(-1).startedAt} /> (avg {queue.service.avgHandleTimeMins} min)
                        </Alert>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                          <Button variant="contained" color="success" startIcon={<CheckIcon />} onClick={() => act('complete', () => completeToken(current._id), `${current.ticketNumber} completed`)} loading={pending === 'complete'} fullWidth>
                            Complete
                          </Button>
                          <Button variant="outlined" startIcon={<EastIcon />} onClick={openTransfer} disabled={services.filter((s) => s.isActive).length < 2} fullWidth>
                            Transfer to next desk
                          </Button>
                        </Stack>
                      </>
                    )}
                    <Box>
                      <Typography variant="subtitle2">Journey</Typography>
                      <WorkflowStepper steps={current.workflowHistory} dense={false} />
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>

            {otherCounters.length > 0 && (
              <Card>
                <CardHeader title="All counters" slotProps={{ title: { variant: 'subtitle1' } }} />
                <CardContent sx={{ pt: 0 }}>
                  <Stack spacing={1}>
                    {otherCounters.map((tok) => (
                      <Stack key={tok._id} direction="row" sx={{
                        justifyContent: "space-between"
                      }}>
                        <Typography>{tok.workflowHistory.at(-1).counterId}</Typography>
                        <Typography sx={{
                          fontWeight: 600
                        }}>
                          {tok.ticketNumber}{' '}
                          <Typography component="span" variant="caption" sx={{
                            color: "text.secondary"
                          }}>
                            {tok.workflowHistory.at(-1).status === 'CALLED' ? 'called' : 'serving'}
                          </Typography>
                        </Typography>
                        <Typography sx={{
                          color: "text.secondary"
                        }}>
                          <Elapsed since={tok.workflowHistory.at(-1).startedAt} />
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* ---------------- Waiting queue */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ mb: 3 }}>
              <CardHeader
                title={`Waiting (${queue.waiting.length})`}
                subheader={`Order = priority bonus + minutes waited. Emergency always first; long waits catch up with boosted tokens.`}
              />
              {queue.waiting.length === 0 ? (
                <CardContent>
                  <Typography sx={{
                    color: "text.secondary"
                  }}>Nobody is waiting for this service.</Typography>
                </CardContent>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Ticket</TableCell>
                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Holder</TableCell>
                        <TableCell>Waited</TableCell>
                        <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>Score</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {queue.waiting.map((tok) => (
                        <TableRow key={tok._id} hover>
                          <TableCell>{tok.position}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{
                              fontWeight: 600
                            }}>
                              {tok.ticketNumber}
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={0.5}
                              useFlexGap
                              sx={{
                                mt: 0.25,
                                flexWrap: "wrap"
                              }}>
                              <PriorityChip tier={tok.priorityTier} />
                              {tok.stepNumber > 1 && <Chip size="small" label={`Step ${tok.stepNumber}`} variant="outlined" />}
                              {tok.groupSize > 1 && <Chip size="small" label={`×${tok.groupSize}`} variant="outlined" />}
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{tok.holderName}</TableCell>
                          <TableCell>{formatDuration(minutesSince(tok.queuedAt))}</TableCell>
                          <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>{tok.priorityScore}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" aria-label={`Priority actions for ${tok.ticketNumber}`} onClick={(e) => setMenu({ anchor: e.currentTarget, token: tok })}>
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>

            {queue.upcoming.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardHeader title={`Scheduled arrivals (${queue.upcoming.length})`} subheader="Join the live order when their slot starts, if checked in." />
                <CardContent sx={{ pt: 0 }}>
                  <Stack spacing={1}>
                    {queue.upcoming.map((tok) => (
                      <Stack
                        key={tok._id}
                        direction="row"
                        sx={{
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                        <Typography sx={{
                          fontWeight: 600
                        }}>{tok.ticketNumber}</Typography>
                        <Typography variant="body2">
                          {formatTime(tok.scheduledSlot.startTime)} – {formatTime(tok.scheduledSlot.endTime)}
                        </Typography>
                        <Chip size="small" color={tok.checkedInAt ? 'success' : 'default'} label={tok.checkedInAt ? 'Checked in' : 'Not checked in'} />
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader title={`Service change requests (${requestsQ.data?.requests.length ?? 0})`} subheader={domain?.name} />
              <CardContent sx={{ pt: 0 }}>
                {requestsQ.error && <ErrorState error={requestsQ.error} onRetry={requestsQ.reload} />}
                {requestsQ.data?.requests.length === 0 && <Typography sx={{
                  color: "text.secondary"
                }}>No pending requests.</Typography>}
                <Stack spacing={1.5}>
                  {requestsQ.data?.requests.map((r) => (
                    <Paper key={r._id} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        sx={{
                          justifyContent: "space-between",
                          alignItems: { sm: 'center' }
                        }}>
                        <Box>
                          <Typography sx={{
                            fontWeight: 600
                          }}>
                            {r.tokenId?.ticketNumber} · {r.fromServiceId.name} → {r.toServiceId.name}
                          </Typography>
                          <Typography variant="body2" sx={{
                            color: "text.secondary"
                          }}>
                            {r.reason || 'No reason given'} · {formatTime(r.createdAt)}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{
                          flexShrink: 0
                        }}>
                          <Button size="small" variant="contained" loading={pending === `approve:${r._id}`} onClick={async () => { if (await runAction(`approve:${r._id}`, () => decideServiceChange(r._id, 'APPROVED'), 'Service change approved')) requestsQ.reload({ silent: true }); }}>
                            Approve
                          </Button>
                          <Button size="small" color="error" loading={pending === `reject:${r._id}`} onClick={async () => { if (await runAction(`reject:${r._id}`, () => decideServiceChange(r._id, 'REJECTED'), 'Service change rejected')) requestsQ.reload({ silent: true }); }}>
                            Reject
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ---------------- Priority menu */}
      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => { setPriorityDialog({ token: menu.token, tier: 3, reason: '' }); setMenu(null); }} disabled={menu?.token.priorityTier === 3}>
          <ListItemIcon><LocalHospitalIcon fontSize="small" color="error" /></ListItemIcon>
          Emergency override
        </MenuItem>
        <MenuItem onClick={() => { setPriorityDialog({ token: menu.token, tier: 2, reason: '' }); setMenu(null); }} disabled={menu?.token.priorityTier >= 2}>
          <ListItemIcon><ElderlyIcon fontSize="small" color="secondary" /></ListItemIcon>
          Senior citizen / vulnerable boost
        </MenuItem>
        <MenuItem onClick={() => { setPriorityDialog({ token: menu.token, tier: 0, reason: '' }); setMenu(null); }} disabled={menu?.token.priorityTier === 0}>
          <ListItemIcon><RestartAltIcon fontSize="small" /></ListItemIcon>
          Reset to walk-in
        </MenuItem>
      </Menu>

      <Dialog open={Boolean(priorityDialog)} onClose={() => setPriorityDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>Change priority · {priorityDialog?.token.ticketNumber}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{
            mt: 1
          }}>
            {priorityDialog?.tier > (priorityDialog?.token.priorityTier ?? 0) && (
              <Alert severity="info">
                <AlertTitle>Queue transparency</AlertTitle>
                Every visitor pushed back will be told exactly why on their screen.
              </Alert>
            )}
            <TextField
              label="Reason (shown in audit trail)"
              value={priorityDialog?.reason || ''}
              onChange={(e) => setPriorityDialog((p) => ({ ...p, reason: e.target.value }))}
              fullWidth
              required={priorityDialog?.tier === 3}
              error={priorityDialog?.tier === 3 && !priorityDialog?.reason?.trim()}
              helperText={priorityDialog?.tier === 3 ? 'Required for emergency overrides' : ''}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPriorityDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={priorityDialog?.tier === 3 ? 'error' : 'primary'}
            disabled={priorityDialog?.tier === 3 && !priorityDialog?.reason?.trim()}
            loading={pending === 'priority'}
            onClick={async () => {
              const { token, tier, reason } = priorityDialog;
              const res = await act('priority', () => setPriority(token._id, { priorityTier: tier, reason }), `${token.ticketNumber}: priority updated`);
              if (res) setPriorityDialog(null);
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- Transfer dialog (multi-step workflow) */}
      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Transfer {current?.ticketNumber} to next desk</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{
            mt: 1
          }}>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              The visitor keeps ticket {current?.ticketNumber}. A new journey step is created at the next service, with queue credit, so they do not
              re-register.
            </Typography>
            <TextField select label="Next service" value={transfer.nextServiceId} onChange={(e) => setTransfer({ ...transfer, nextServiceId: e.target.value })} fullWidth>
              {services
                .filter((s) => s._id !== serviceId && s.isActive)
                .map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.name}
                    {s._id === suggestedNext ? ' (suggested)' : ''}
                  </MenuItem>
                ))}
            </TextField>
            <TextField label="Notes for next desk (optional)" value={transfer.notes} onChange={(e) => setTransfer({ ...transfer, notes: e.target.value })} multiline minRows={2} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!transfer.nextServiceId}
            loading={pending === 'transfer'}
            onClick={async () => {
              const res = await act('transfer', () => transferToken(current._id, transfer), (r) => `${r.token.ticketNumber} → ${r.token.serviceName} (#${r.token.position})`);
              if (res) setTransferOpen(false);
            }}
          >
            Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
