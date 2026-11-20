import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { getDisplayBoard } from '../../services/api/counterService';
import { on, EVENTS } from '../../services/realtime/realtime';
import { useApi, useNow } from '../../hooks/useApi';
import { usePreferences } from '../../hooks/usePreferences';
import { ErrorState, LoadingState } from '../../components/common/States';
import { formatTime } from '../../utils/format';

const DARK = { bg: '#0b1220', card: '#111a2e', text: '#f8fafc', muted: '#94a3b8', accent: '#38bdf8', flash: '#facc15' };

/**
 * Full-screen hall display: "Now serving" per service and counter, next tokens,
 * and spoken announcements (browser text-to-speech) on every call.
 */
export default function DisplayBoardPage() {
  const { domainId } = useParams();
  const { t, speakText } = usePreferences();
  const now = useNow(1000);
  const [soundOn, setSoundOn] = useState(false);
  const [flash, setFlash] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    if (fullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      // if document is focused and in fullscreen, exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    }
  }, [fullscreen]);
  const soundRef = useRef(soundOn);
  const { data, loading, error, reload } = useApi(() => getDisplayBoard(domainId), [domainId], {
    refreshOn: [EVENTS.QUEUE_UPDATED, EVENTS.TOKEN_UPDATED],
    intervalMs: 30000,
  });

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  useEffect(
    () =>
      on(EVENTS.TOKEN_CALLED, (p) => {
        if (p.domainId !== domainId) return;
        setFlash(p);
        if (soundRef.current) speakText(t('announce.called', { ticket: p.ticketNumber, counter: p.counterId }));
        setTimeout(() => setFlash((f) => (f === p ? null : f)), 8000);
      }),
    [domainId, speakText, t],
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: DARK.bg,
        color: DARK.text,
        p: { xs: 2, md: 4 }
      }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: { md: 'center' },
          mb: 3
        }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{
            fontWeight: 800
          }}>
            {data?.domain.name || 'Display board'}
          </Typography>
          <Typography sx={{ color: DARK.muted }}>Please wait in a comfortable area. Your number will be called here and on your phone.</Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <Typography
            variant="h4"
            component="p"
            sx={{
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              mr: 1
            }}>
            {formatTime(now)}
          </Typography>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={soundOn ? <VolumeUpIcon /> : <VolumeOffIcon />}
            onClick={() => {
              setSoundOn((s) => !s);
              if (!soundOn) speakText('Announcements enabled');
            }}
          >
            {soundOn ? 'Sound on' : 'Enable sound'}
          </Button>
          <Button variant="outlined" color="inherit" onClick={() => setFullscreen(!fullscreen)} aria-label="Full screen">
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </Button>
          <Button variant="outlined" color="inherit" component={RouterLink} to="/display" aria-label="Back">
            <ArrowBackIcon />
          </Button>
        </Stack>
      </Stack>

      {flash && (
        <Paper sx={{ bgcolor: DARK.flash, color: '#000', p: { xs: 2, md: 3 }, mb: 3, textAlign: 'center' }} role="alert" aria-live="assertive">
          <Typography
            variant="h3"
            component="p"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '2rem', md: '3.5rem' }
            }}>
            {flash.ticketNumber} → {flash.counterId}
          </Typography>
          <Typography variant="h6">{flash.serviceName}</Typography>
        </Paper>
      )}

      {loading && !data && <LoadingState />}
      {error && <ErrorState error={error} onRetry={reload} />}

      <Grid container spacing={3}>
        {data?.services.map(({ service, serving, next }) => (
          <Grid key={service._id} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper sx={{ bgcolor: DARK.card, color: DARK.text, p: 2.5, height: '100%' }}>
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2
                }}>
                <Typography variant="h6" sx={{
                  fontWeight: 700
                }}>
                  {service.name}
                </Typography>
                <Chip label={`${service.waitingCount} waiting`} size="small" sx={{ bgcolor: '#1e293b', color: DARK.text }} />
              </Stack>
              <Typography variant="overline" sx={{ color: DARK.muted }}>
                Now serving
              </Typography>
              {serving.length === 0 && <Typography sx={{ color: DARK.muted }}>-</Typography>}
              {serving.map((tok) => (
                <Stack
                  key={tok._id}
                  direction="row"
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    py: 0.5
                  }}>
                  <Typography
                    variant="h4"
                    component="p"
                    sx={{
                      fontWeight: 800,
                      color: tok.workflowHistory.at(-1).status === 'CALLED' ? DARK.flash : DARK.accent
                    }}>
                    {tok.ticketNumber}
                  </Typography>
                  <Typography sx={{ color: DARK.muted }}>{tok.workflowHistory.at(-1).counterId}</Typography>
                </Stack>
              ))}
              <Typography variant="overline" sx={{ color: DARK.muted, display: 'block', mt: 2 }}>
                Next
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{
                flexWrap: "wrap"
              }}>
                {next.length === 0 && <Typography sx={{ color: DARK.muted }}>-</Typography>}
                {next.map((tok) => (
                  <Chip key={tok._id} label={tok.ticketNumber} sx={{ bgcolor: '#1e293b', color: DARK.text, fontSize: '1rem', height: 34 }} />
                ))}
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
