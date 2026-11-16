import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TvIcon from '@mui/icons-material/Tv';
import InsightsIcon from '@mui/icons-material/Insights';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States';
import DomainFormDialog from '../../components/domains/DomainFormDialog';
import ServiceFormDialog from '../../components/domains/ServiceFormDialog';
import { getDomainById } from '../../services/api/domainService';
import { getServices, updateService, deleteService } from '../../services/api/catalogService';
import { getUsers } from '../../services/api/userService';
import { storage } from '../../utils/storage';
import { useApi, useAction } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { useNotify } from '../../hooks/useNotify';
import { workflowNamesForType } from '../../blueprints';
import { ROLES, STORAGE_KEYS } from '../../config/appConfig';

/** Domain detail: rules, quick links, and the service catalogue (CRUD). */
export default function DomainDetailPage() {
  const { domainId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const notify = useNotify();
  const isAdmin = user.role === ROLES.ADMIN;
  const domainQ = useApi(() => getDomainById(domainId), [domainId]);
  const servicesQ = useApi(() => getServices({ domainId }), [domainId], { refreshOn: ['queue:updated'] });
  const usersQ = useApi(getUsers, [], { enabled: isAdmin });
  const { pending, runAction } = useAction(notify);
  const [serviceDialog, setServiceDialog] = useState(null); // { service | null }
  const [editDomain, setEditDomain] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const domain = domainQ.data;
  const services = servicesQ.data?.services || [];
  const moderators = (usersQ.data?.users || []).filter((u) => u.role === ROLES.MODERATOR);
  const moderatorName = domain && (domain.moderatorRef === user._id ? 'You' : (usersQ.data?.users || []).find((u) => u._id === domain.moderatorRef)?.name || 'Unassigned');
  const workflow = workflowNamesForType(domain?.type);

  const openConsole = () => {
    storage.set(STORAGE_KEYS.console, { ...storage.get(STORAGE_KEYS.console, {}), domainId, serviceId: services[0]?._id });
    navigate('/console');
  };

  if (domainQ.loading) return <LoadingState />;
  if (domainQ.error) return <ErrorState error={domainQ.error} onRetry={domainQ.reload} />;
  if (!domain) {
    return (
      <EmptyState
        title="Domain not found"
        description="It may have been deleted, or you do not moderate it."
        action={
          <Button component={RouterLink} to="/domains">
            Back to domains
          </Button>
        }
      />
    );
  }

  return (
    <>
      <Button component={RouterLink} to="/domains" startIcon={<ArrowBackIcon />} sx={{ mb: 1 }}>
        Domains
      </Button>
      <PageHeader
        title={domain.name}
        subtitle={`${domain.type} · Moderator: ${moderatorName}`}
        actions={
          <>
            <Button startIcon={<SupportAgentIcon />} onClick={openConsole}>
              Console
            </Button>
            <Button startIcon={<TvIcon />} component={RouterLink} to={`/display/${domainId}`}>
              Display
            </Button>
            <Button startIcon={<InsightsIcon />} component={RouterLink} to={`/analytics?domainId=${domainId}`}>
              Analytics
            </Button>
            {isAdmin && (
              <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setEditDomain(true)}>
                Edit rules
              </Button>
            )}
          </>
        }
      />

      <Grid container spacing={2} sx={{
        mb: 3
      }}>
        {[
          ['Group bookings', domain.settings.allowGroupBooking ? `Allowed, up to ${domain.settings.maxGroupSize}` : 'Not allowed'],
          ['No-show timeout', `${domain.settings.noShowTimeoutMins} minutes after call`],
          ['Services', `${services.filter((s) => s.isActive).length} active of ${services.length}`],
        ].map(([label, value]) => (
          <Grid key={label} size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {label}
                </Typography>
                <Typography sx={{
                  fontWeight: 600
                }}>{value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.5
        }}>
        <Typography variant="h6" component="h2">
          Services
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setServiceDialog({ service: null })}>
          Add service
        </Button>
      </Stack>
      {workflow.length > 0 && (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 1.5
          }}>
          Blueprint journey: {workflow.join(' → ')} (used to suggest the next desk on transfer)
        </Typography>
      )}

      {servicesQ.loading && <LoadingState rows={3} />}
      {servicesQ.error && <ErrorState error={servicesQ.error} onRetry={servicesQ.reload} />}
      {servicesQ.data && services.length === 0 && <EmptyState title="No services yet" description="Add the desks/counters visitors can queue for." />}
      {services.length > 0 && (
        <Paper variant="outlined">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell>Prefix</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Avg time</TableCell>
                  <TableCell>Waiting</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Counters active</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s._id} hover>
                    <TableCell>
                      <Typography sx={{
                        fontWeight: 600
                      }}>{s.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={s.prefix} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{s.avgHandleTimeMins} min</TableCell>
                    <TableCell>{s.waitingCount}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{s.activeCounters}</TableCell>
                    <TableCell>
                      <Switch
                        checked={s.isActive}
                        disabled={pending === `toggle:${s._id}`}
                        onChange={async (e) => {
                          const res = await runAction(`toggle:${s._id}`, () => updateService(s._id, { isActive: e.target.checked }), `${s.name} ${e.target.checked ? 'activated' : 'paused'}`);
                          if (res) servicesQ.reload({ silent: true });
                        }}
                        slotProps={{ input: { 'aria-label': `${s.name} accepting tokens` } }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => setServiceDialog({ service: s })} aria-label={`Edit ${s.name}`}>
                          <EditOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton color="error" onClick={() => setDeleteTarget(s)} aria-label={`Delete ${s.name}`}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {serviceDialog && (
        <ServiceFormDialog
          open
          domainId={domainId}
          service={serviceDialog.service}
          onClose={() => setServiceDialog(null)}
          onSaved={(_, message) => {
            notify(message);
            setServiceDialog(null);
            servicesQ.reload({ silent: true });
          }}
        />
      )}
      {editDomain && (
        <DomainFormDialog
          open
          domain={domain}
          moderators={moderators}
          onClose={() => setEditDomain(false)}
          onSaved={(_, message) => {
            notify(message);
            setEditDomain(false);
            domainQ.reload({ silent: true });
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete service"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? Services with people waiting cannot be deleted. Pause them instead.` : ''}
        confirmLabel="Delete"
        danger
        pending={pending === 'delete'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          const res = await runAction('delete', () => deleteService(deleteTarget._id), 'Service deleted');
          setDeleteTarget(null);
          if (res) servicesQ.reload({ silent: true });
        }}
      />
      <Box sx={{
        height: 24
      }} />
    </>
  );
}
