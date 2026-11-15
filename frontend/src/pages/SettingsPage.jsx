import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VibrationIcon from '@mui/icons-material/Vibration';
import PageHeader from '../components/common/PageHeader';
import { ErrorState, LoadingState } from '../components/common/States';
import { getMe } from '../services/api/authService';
import { checkHealth } from '../services/api/miscServices';
import { useApi } from '../hooks/useApi';
import { usePreferences } from '../hooks/usePreferences';
import { useNotify } from '../hooks/useNotify';
import { useAuth } from '../hooks/useAuth';
import { LANGUAGES } from '../i18n/translations';
import { canSpeak, canVibrate, vibrate } from '../utils/announce';
import { formatDate } from '../utils/format';
import { API_BASE_URL, ROLES } from '../config/appConfig';

/** Profile (GET /api/auth/me), accessibility preferences, and connection info. */
export default function SettingsPage() {
  const { prefs, setPref, t, speakText } = usePreferences();
  const { user } = useAuth();
  const me = useApi(getMe, []);
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);

  const runHealth = async () => {
    setChecking(true);
    try {
      setHealth({ ok: true, ...(await checkHealth()) });
    } catch (err) {
      setHealth({ ok: false, message: err.message });
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <PageHeader title={t('nav.settings')} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardHeader title={t('settings.accessibility')} />
            <CardContent>
              <Stack spacing={3}>
                <TextField select label={t('settings.language')} value={prefs.language} onChange={(e) => setPref('language', e.target.value)} sx={{ maxWidth: 280 }}>
                  {LANGUAGES.map((l) => (
                    <MenuItem key={l.code} value={l.code}>
                      {l.label}
                    </MenuItem>
                  ))}
                </TextField>
                <FormControlLabel control={<Switch checked={prefs.highContrast} onChange={(e) => setPref('highContrast', e.target.checked)} />} label={t('settings.highContrast')} />
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}>
                  <FormControlLabel control={<Switch checked={prefs.tts} onChange={(e) => setPref('tts', e.target.checked)} disabled={!canSpeak()} />} label={t('settings.tts')} />
                  <Button size="small" startIcon={<VolumeUpIcon />} onClick={() => speakText(t('announce.test'))} disabled={!canSpeak()}>
                    {t('settings.test')}
                  </Button>
                  {!canSpeak() && <Chip size="small" label="Not supported in this browser" />}
                </Stack>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}>
                  <FormControlLabel control={<Switch checked={prefs.vibration} onChange={(e) => setPref('vibration', e.target.checked)} />} label={t('settings.vibration')} />
                  <Button size="small" startIcon={<VibrationIcon />} onClick={() => vibrate()} disabled={!canVibrate()}>
                    {t('settings.test')}
                  </Button>
                  {!canVibrate() && <Chip size="small" label="Not supported on this device" />}
                </Stack>
                {user.role === ROLES.USER && (
                  <Box sx={{
                    maxWidth: 420
                  }}>
                    <Typography gutterBottom>
                      {t('settings.safeDistance')}: <strong>{prefs.safeDistance}</strong>
                    </Typography>
                    <Slider
                      value={prefs.safeDistance}
                      min={1}
                      max={10}
                      step={1}
                      marks
                      valueLabelDisplay="auto"
                      onChange={(_, v) => setPref('safeDistance', v)}
                      aria-label={t('settings.safeDistance')}
                    />
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Profile" />
            <CardContent>
              {me.loading && <LoadingState />}
              {me.error && <ErrorState error={me.error} onRetry={me.reload} />}
              {me.data && (
                <Stack spacing={1}>
                  <Typography>
                    <strong>{me.data.user.name}</strong>
                  </Typography>
                  <Typography sx={{
                    color: "text.secondary"
                  }}>{me.data.user.email}</Typography>
                  <Box>
                    <Chip label={me.data.user.role} color="primary" size="small" />
                  </Box>
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>
                    Member since {formatDate(me.data.user.createdAt)}
                  </Typography>
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Connection" />
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  Backend URL: <code>{API_BASE_URL}</code>
                </Typography>
                <Box>
                  <Button size="small" variant="outlined" onClick={runHealth} loading={checking}>
                    Check API status
                  </Button>
                </Box>
                {health && <Alert severity={health.ok ? 'success' : 'error'}>{health.message}</Alert>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
