import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AuthLayout from '../../layouts/AuthLayout';
import TokenCard from '../../components/tokens/TokenCard';
import { ErrorState, LoadingState } from '../../components/common/States';
import { trackToken } from '../../services/api/tokenService';
import { useApi } from '../../hooks/useApi';
import { useT } from '../../hooks/usePreferences';
import { useAuth } from '../../hooks/useAuth';

export default function TrackTokenPage() {
  const t = useT();
  const { ticketNumber } = useParams();
  const navigate = useNavigate();
  const { status } = useAuth();
  const [value, setValue] = useState(ticketNumber || '');

  const { data, loading, error, reload } = useApi(() => trackToken(ticketNumber), [ticketNumber], {
    enabled: Boolean(ticketNumber),
    refreshOn: ['queue:updated', 'token:updated', 'token:shifted'],
    intervalMs: 30000,
  });

  const submit = (e) => {
    e.preventDefault();
    const v = value.trim().toUpperCase();
    if (v) navigate(`/track/${encodeURIComponent(v)}`);
  };

  return (
    <AuthLayout maxWidth="sm">
      <Typography variant="h5" component="h1" gutterBottom>
        {t('track.title')}
      </Typography>
      <Typography
        sx={{
          color: "text.secondary",
          mb: 2
        }}>
        {t('track.subtitle')}
      </Typography>
      <Stack component="form" direction="row" spacing={1} onSubmit={submit} sx={{
        mb: 3
      }}>
        <TextField
          fullWidth
          size="small"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('track.placeholder')}
          slotProps={{ htmlInput: { 'aria-label': t('track.placeholder'), style: { textTransform: 'uppercase' } } }}
        />
        <Button type="submit" variant="contained" startIcon={<SearchIcon />} disabled={!value.trim()}>
          {t('track.button')}
        </Button>
      </Stack>

      {loading && <LoadingState label={t('common.loading')} />}
      {error && <ErrorState error={error} onRetry={reload} retryLabel={t('common.retry')} />}
      {data && !loading && <TokenCard token={data.token} />}

      <Box
        sx={{
          mt: 3,
          textAlign: "center"
        }}>
        <Link component={RouterLink} to={status === 'authenticated' ? '/' : '/login'}>
          {status === 'authenticated' ? '← WaitLess' : 'Sign in'}
        </Link>
      </Box>
    </AuthLayout>
  );
}
