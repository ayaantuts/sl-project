import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { register } from '../../services/api/authService';
import { EMAIL_REGEX } from '../../utils/format';
import { useNotify } from '../../hooks/useNotify';
import { useT } from '../../hooks/usePreferences';

export default function RegisterPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const t = useT();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const errors = {
    name: !form.name.trim() ? t('auth.errNameRequired') : form.name.trim().length < 2 ? 'Name is too short' : '',
    email: !form.email ? t('auth.errEmailRequired') : !EMAIL_REGEX.test(form.email) ? t('auth.errEmailInvalid') : '',
    password: !form.password ? t('auth.errPasswordRequired') : form.password.length < 6 ? t('auth.errPasswordShort') : '',
    confirm: form.confirm !== form.password ? t('auth.errMismatch') : '',
  };
  const invalid = Object.values(errors).some(Boolean);

  const field = (key, props) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
    onBlur: () => form[key] && setTouched((t) => ({ ...t, [key]: true })),
    error: touched[key] && Boolean(errors[key]),
    helperText: touched[key] && errors[key],
    fullWidth: true,
    ...props,
  });

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (invalid) return;
    setPending(true);
    setError(null);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      notify(t('auth.created'));
      navigate('/login', { state: { email: form.email.trim(), registered: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <Typography variant="h5" component="h1" gutterBottom>
        {t('auth.registerTitle')}
      </Typography>
      <Typography
        sx={{
          color: "text.secondary",
          mb: 3
        }}>
        {t('auth.registerHint')}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack spacing={2}>
        <TextField label={t('auth.fullName')} autoComplete="name" autoFocus {...field('name')} />
        <TextField label={t('auth.email')} type="email" autoComplete="email" {...field('email')} />
        <TextField label={t('auth.password')} type="password" autoComplete="new-password" {...field('password')} />
        <TextField label={t('auth.confirmPassword')} type="password" autoComplete="new-password" {...field('confirm')} />
        <Button type="submit" variant="contained" size="large" loading={pending}>
          {t('auth.createAccount')}
        </Button>
      </Stack>
      <Typography variant="body2" sx={{
        mt: 2
      }}>
        {t('auth.alreadyRegistered')}{' '}
        <Link component={RouterLink} to="/login">
          {t('auth.signIn')}
        </Link>
      </Typography>
    </Box>
  );
}
