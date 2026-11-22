import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import BarList from '../../components/common/BarList';
import HourlyChart from '../../components/common/HourlyChart';
import { ErrorState, LoadingState } from '../../components/common/States';
import { getDomains } from '../../services/api/domainService';
import { getDomainAnalytics } from '../../services/api/miscServices';
import { useApi } from '../../hooks/useApi';
import { formatDuration, formatTime } from '../../utils/format';
import { TARGET_WAIT_MINUTES } from '../../config/appConfig';

const LIVE = ['queue:updated', 'token:updated'];

function AnalyticsPageComponent({ domain, multi=false }) {
  const totals = domain?.totals;
  const understaffed = (domain?.services || []).filter((s) => s.isActive && s.recommendedCounters > Math.max(1, s.activeCounters));

  return (<>
    {totals && (
      <>
        <Grid container spacing={2} sx={{
          mb: 3
        }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Tokens issued today" value={totals.issued} hint={`${totals.completed} completed · ${totals.multiStepJourneys} multi-step`} icon={<ConfirmationNumberOutlinedIcon />} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Waiting now" value={totals.waiting} hint={`${totals.serving} in service · ${totals.upcoming} scheduled`} icon={<HourglassBottomIcon />} color="warning.main" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Avg wait / service" value={formatDuration(totals.avgWaitMins)} hint={`Service time ${formatDuration(totals.avgServiceMins)}`} icon={<TimerOutlinedIcon />} color="info.main" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="No-show rate" value={`${Math.round(totals.noShowRate * 100)}%`} hint={`${totals.missed} missed · ${totals.cancelled} cancelled`} icon={<PersonOffOutlinedIcon />} color="error.main" />
          </Grid>
        </Grid>

        {understaffed.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <strong>Staffing needed:</strong>{' '}
            {understaffed.map((s) => `${s.serviceName} needs ${s.recommendedCounters} counters (${Math.max(1, s.activeCounters)} active)`).join('; ')}. Target wait: {TARGET_WAIT_MINUTES} min.
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardHeader title="Service performance & bottlenecks" subheader={`Generated ${formatTime(domain.generatedAt)} · backlog = waiting × avg time ÷ active counters`} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell align="right">Waiting</TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Served</TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Avg wait</TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Avg service</TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Velocity</TableCell>
                  <TableCell align="right">Backlog</TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Counters</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {domain.services.map((s) => (
                  <TableRow key={s.serviceId} sx={s.isBottleneck ? { bgcolor: (th) => alpha(th.palette.error.main, 0.08), '& td': { fontWeight: 600 } } : undefined}>
                    <TableCell>
                      {s.serviceName} {s.isBottleneck && <Chip label="Bottleneck" color="error" size="small" sx={{ ml: 0.5 }} />}
                      {!s.isActive && <Chip label="Paused" size="small" sx={{ ml: 0.5 }} />}
                      {multi && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            display: "block"
                          }}>
                          {s.domainName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{s.waiting}</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{s.completedSteps}</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{formatDuration(s.avgWaitMins)}</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{formatDuration(s.avgServiceMins)}</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{s.throughputPerHour}/h</TableCell>
                    <TableCell align="right">{formatDuration(s.backlogMins)}</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      {s.activeCounters} / {s.recommendedCounters}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title="Peak-hour traffic" subheader="Tokens issued per hour today" />
              <CardContent>
                <HourlyChart rows={domain.hourly} />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title="Counter throughput" subheader="Journey steps served per counter" />
              <CardContent>
                <BarList
                  items={domain.counters.slice(0, 8).map((c) => ({
                    label: `${c.counterId} · ${c.serviceName}`,
                    value: c.served,
                    caption: `avg ${formatDuration(c.avgServiceMins)}`,
                  }))}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                Queue transparency: <strong>{totals.positionShiftEvents}</strong> position changes were explained to visitors today.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </>
    )}
  </>);
}

export default function AnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const domainId = params.get('domainId') || 'all';
  const domainsQ = useApi(getDomains, []);
  const { data, loading, error, reload } = useApi(() => getDomainAnalytics(domainId), [domainId], { refreshOn: LIVE, intervalMs: 60000 });
  const multi = domainId === 'all';

  return (
    <>
      <PageHeader
        title="Operational Analytics"
        subtitle="Today's live queue health across counters. Updates automatically."
        actions={
          <TextField
            select
            size="small"
            label="Domain"
            value={domainsQ.data?.domains.some((d) => d._id === domainId) || multi ? domainId : 'all'}
            onChange={(e) => setParams(e.target.value === 'all' ? {} : { domainId: e.target.value })}
            sx={{ minWidth: 260 }}
          >
            <MenuItem value="all">All my domains</MenuItem>
            {domainsQ.data?.domains.map((d) => (
              <MenuItem key={d._id} value={d._id}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>
        }
      />
      {loading && !data && <LoadingState rows={4} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {
        !loading && data && Array.isArray(data) ?
          data.map((domain, index) => (
            <AnalyticsPageComponent domain={domain} multi={multi} key={index} />
          )) :
          <AnalyticsPageComponent domain={data} />
      }
    </>
  );
}
