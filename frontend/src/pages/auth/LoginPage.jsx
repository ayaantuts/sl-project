import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, IconButton, InputAdornment, Link, Stack, TextField, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../../hooks/useAuth';
import { useT } from '../../hooks/usePreferences';
import { homePathFor } from '../../routes/homePath';
import { EMAIL_REGEX } from '../../utils/format';

export default function LoginPage() {
  const { login } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: location.state?.email || '', password: '' });
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const errors = {
    email: !form.email ? t('auth.errEmailRequired') : !EMAIL_REGEX.test(form.email) ? t('auth.errEmailInvalid') : '',
    password: !form.password ? t('auth.errPasswordRequired') : '',
  };
  const invalid = Boolean(errors.email || errors.password);

  const submit = async (credentials = form) => {
    setTouched({ email: true, password: true });
    if (credentials === form && invalid) return;
    setPending(true);
    setError(null);
    try {
      const user = await login(credentials);
      const from = location.state?.from?.pathname;
      navigate(from && from !== '/' ? from : homePathFor(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Typography variant="h5" component="h1" gutterBottom>
        {t('auth.signIn')}
      </Typography>
      <Typography
        sx={{
          color: "text.secondary",
          mb: 3
        }}>
        {t('auth.signInHint')}
      </Typography>
      {location.state?.registered && !error && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t('auth.created')}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack spacing={2}>
        <TextField
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          onBlur={() => form.email && setTouched((t) => ({ ...t, email: true }))}
          error={touched.email && Boolean(errors.email)}
          helperText={touched.email && errors.email}
          fullWidth
          autoFocus
        />
        <TextField
          label={t('auth.password')}
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          onBlur={() => form.password && setTouched((t) => ({ ...t, password: true }))}
          error={touched.password && Boolean(errors.password)}
          helperText={touched.password && errors.password}
          fullWidth
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Button type="submit" variant="contained" size="large" loading={pending}>
          {t('auth.signIn')}
        </Button>
      </Stack>

      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          mt: 2,
          flexWrap: "wrap",
          gap: 1
        }}>
        <Link component={RouterLink} to="/register">
          {t('auth.createAccount')}
        </Link>
        <Link component={RouterLink} to="/track">
          {t('auth.trackWithout')}
        </Link>
      </Stack>
    </Box>
  );
}
