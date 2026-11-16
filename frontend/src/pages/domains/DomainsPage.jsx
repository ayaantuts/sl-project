import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PageHeader from '../../components/common/PageHeader';
import SortableHeader from '../../components/common/SortableHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States';
import DomainFormDialog from '../../components/domains/DomainFormDialog';
import { getDomains, deleteDomain } from '../../services/api/domainService';
import { getUsers } from '../../services/api/userService';
import { useApi, useAction } from '../../hooks/useApi';
import { useTableControls } from '../../hooks/useTableControls';
import { useAuth } from '../../hooks/useAuth';
import { useNotify } from '../../hooks/useNotify';
import { formatDate } from '../../utils/format';
import { ROLES } from '../../config/appConfig';

/**
 * Domains list. Admin: full CRUD (GET/POST/PUT/DELETE /api/domain).
 * Moderator: read-only list of own domains (backend filters by moderatorRef).
 */
export default function DomainsPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const isAdmin = user.role === ROLES.ADMIN;
  const domainsQ = useApi(getDomains, [], { refreshOn: ['queue:updated'] });
  const usersQ = useApi(getUsers, [], { enabled: isAdmin }); // GET /api/user is Admin-only
  const { pending, runAction } = useAction(notify);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dialog, setDialog] = useState(null); // { domain | null }
  const [deleteTarget, setDeleteTarget] = useState(null);

  const users = usersQ.data?.users || [];
  const moderators = users.filter((u) => u.role === ROLES.MODERATOR);
  const moderatorName = (id) => (id === user._id ? 'You' : users.find((u) => u._id === id)?.name || 'Unassigned');

  const rows = domainsQ.data?.domains || [];
  const types = [...new Set(rows.map((d) => d.type))];
  const table = useTableControls(rows, {
    searchFields: ['name', 'type', (d) => moderatorName(d.moderatorRef)],
    initialSort: { field: 'name', direction: 'asc' },
    filters: { type: typeFilter },
  });

  return (
    <>
      <PageHeader
        title="Domains & Services"
        subtitle={isAdmin ? 'Configure queue domains from blueprints, assign moderators and set queue rules.' : 'Domains you moderate. Open one to manage its services.'}
        actions={(
          isAdmin && 
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ domain: null })}>
                New domain
              </Button>
          
        )}
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            placeholder="Search name, type or moderator"
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField select size="small" label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="ALL">All types</MenuItem>
            {types.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {domainsQ.loading && <LoadingState rows={4} />}
      {domainsQ.error && <ErrorState error={domainsQ.error} onRetry={domainsQ.reload} />}
      {domainsQ.data && rows.length === 0 && (
        <EmptyState
          title="No domains yet"
          description={isAdmin ? 'Create your first domain from a blueprint.' : 'You are not assigned to any domain.'}
          action={
            isAdmin && (
              <Button variant="contained" onClick={() => setDialog({ domain: null })}>
                New domain
              </Button>
            )
          }
        />
      )}
      {domainsQ.data && rows.length > 0 && (
        <Paper variant="outlined">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <SortableHeader field="name" label="Name" controls={table} />
                  <SortableHeader field="type" label="Type" controls={table} />
                  <SortableHeader field="moderator" label="Moderator" controls={table} getValue={(d) => moderatorName(d.moderatorRef)} sx={{ display: { xs: 'none', md: 'table-cell' } }} />
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Rules</TableCell>
                  <SortableHeader field="createdAt" label="Created" controls={table} sx={{ display: { xs: 'none', md: 'table-cell' } }} />
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {table.pageRows.map((d) => (
                  <TableRow key={d._id} hover>
                    <TableCell>
                      <Link component={RouterLink} to={`/domains/${d._id}`} underline="hover" sx={{
                        fontWeight: 600
                      }}>
                        {d.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Chip label={d.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{moderatorName(d.moderatorRef)}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      {d.settings.allowGroupBooking ? `Groups ≤ ${d.settings.maxGroupSize}` : 'No groups'} · No-show {d.settings.noShowTimeoutMins} min
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{formatDate(d.createdAt)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {isAdmin && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton onClick={() => setDialog({ domain: d })} aria-label={`Edit ${d.name}`}>
                              <EditOutlinedIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton color="error" onClick={() => setDeleteTarget(d)} aria-label={`Delete ${d.name}`}>
                              <DeleteOutlineIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Open">
                        <IconButton component={RouterLink} to={`/domains/${d._id}`} aria-label={`Open ${d.name}`}>
                          <ChevronRightIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {table.pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No domains match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={table.total}
            page={table.page}
            onPageChange={(_, p) => table.setPage(p)}
            rowsPerPage={table.rowsPerPage}
            onRowsPerPageChange={(e) => table.setRowsPerPage(Number(e.target.value))}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </Paper>
      )}

      {dialog && (
        <DomainFormDialog
          open
          domain={dialog.domain}
          moderators={moderators}
          onClose={() => setDialog(null)}
          onSaved={(_, message) => {
            notify(message);
            setDialog(null);
            domainsQ.reload({ silent: true });
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete domain"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
        pending={pending === 'delete'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          const res = await runAction('delete', () => deleteDomain(deleteTarget._id), 'Domain deleted');
          setDeleteTarget(null);
          if (res) domainsQ.reload({ silent: true });
        }}
      />
    </>
  );
}
