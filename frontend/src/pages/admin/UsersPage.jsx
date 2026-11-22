import { useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import PageHeader from '../../components/common/PageHeader';
import SortableHeader from '../../components/common/SortableHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { ErrorState, LoadingState } from '../../components/common/States';
import { getUsers, deleteUser, createUser } from '../../services/api/userService';
import { useApi, useAction } from '../../hooks/useApi';
import { useTableControls } from '../../hooks/useTableControls';
import { useAuth } from '../../hooks/useAuth';
import { useNotify } from '../../hooks/useNotify';
import { EMAIL_REGEX, formatDate, initials } from '../../utils/format';
import { ROLES } from '../../config/appConfig';

const ROLE_COLORS = { Admin: 'error', Moderator: 'primary', User: 'default' };
const EMPTY = { name: '', email: '', password: '', role: ROLES.MODERATOR };

/** Admin user management: GET /api/user, DELETE /api/user/:id, POST /api/auth/register (with role). */
export default function UsersPage() {
  const { user: me } = useAuth();
  const notify = useNotify();
  const { data, loading, error, reload } = useApi(getUsers, []);
  const { pending, runAction } = useAction(notify);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const users = data?.users || [];
  const table = useTableControls(users, {
    searchFields: ['name', 'email'],
    initialSort: { field: 'createdAt', direction: 'desc' },
    filters: { role: roleFilter },
  });
  const counts = users.reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] || 0) + 1 }), {});

  const errors = {
    name: !form.name.trim() ? 'Name is required' : '',
    email: !EMAIL_REGEX.test(form.email) ? 'Enter a valid email' : '',
    password: form.password.length < 6 ? 'At least 6 characters' : '',
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    setFormError(null);
    try {
      await createUser({ ...form, name: form.name.trim(), email: form.email.trim() });
      notify(`${form.role} account created for ${form.name.trim()}`);
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
        title="Users"
        subtitle="Citizens, counter staff (moderators) and administrators."
        actions={
          <Button variant="contained" startIcon={<PersonAddAlt1Icon />} onClick={() => setOpen(true)}>
            Add account
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs value={roleFilter} onChange={(_, v) => { setRoleFilter(v); table.setPage(0); }} variant="scrollable" allowScrollButtonsMobile>
          <Tab value="ALL" label={`All (${users.length})`} />
          {Object.values(ROLES).map((r) => (
            <Tab key={r} value={r} label={`${r}s (${counts[r] || 0})`} />
          ))}
        </Tabs>
        <Stack
          sx={{
            p: 2,
            pt: 1.5
          }}>
          <TextField
            size="small"
            placeholder="Search by name or email"
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }}
          />
        </Stack>
      </Paper>

      {loading && <LoadingState rows={5} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <Paper variant="outlined">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <SortableHeader field="name" label="Name" controls={table} />
                  <SortableHeader field="email" label="Email" controls={table} sx={{ display: { xs: 'none', sm: 'table-cell' } }} />
                  <SortableHeader field="role" label="Role" controls={table} />
                  <SortableHeader field="createdAt" label="Joined" controls={table} sx={{ display: { xs: 'none', md: 'table-cell' } }} />
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {table.pageRows.map((u) => (
                  <TableRow key={u._id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{
                        alignItems: "center"
                      }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>{initials(u.name)}</Avatar>
                        <div>
                          <Typography variant="body2" component="div" sx={{
                            fontWeight: 600
                          }}>
                            {u.name} {u._id === me._id && <Chip label="You" size="small" sx={{ ml: 0.5 }} />}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              display: { sm: 'none' }
                            }}>
                            {u.email}
                          </Typography>
                        </div>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{u.email}</TableCell>
                    <TableCell>
                      <Chip label={u.role} size="small" color={ROLE_COLORS[u.role]} variant={u.role === 'User' ? 'outlined' : 'filled'} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{formatDate(u.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={u._id === me._id ? 'You cannot delete your own account' : 'Delete'}>
                        <span>
                          <IconButton color="error" disabled={u._id === me._id} onClick={() => setDeleteTarget(u)} aria-label={`Delete ${u.name}`}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {table.pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No users match your filters.
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

      <Dialog open={open} onClose={saving ? undefined : () => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add account</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{
            mt: 1
          }}>
            <Alert severity="info">Uses POST /api/auth/register with a role. The new user signs in with these credentials.</Alert>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={touched && Boolean(errors.name)} helperText={touched && errors.name} fullWidth />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={touched && Boolean(errors.email)} helperText={touched && errors.email} fullWidth />
            <TextField label="Temporary password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={touched && Boolean(errors.password)} helperText={touched && errors.password} fullWidth autoComplete="new-password" />
            <TextField select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} fullWidth>
              {Object.values(ROLES).map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={save} loading={saving}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user"
        message={deleteTarget ? `Delete ${deleteTarget.name} (${deleteTarget.email})? This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
        pending={pending === 'delete'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          const res = await runAction('delete', () => deleteUser(deleteTarget._id), 'User deleted');
          setDeleteTarget(null);
          if (res) reload({ silent: true });
        }}
      />
    </>
  );
}
