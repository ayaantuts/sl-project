import { useState } from 'react';
import { Alert, AlertTitle, Box, Button, Card, CardActions, CardContent, Chip, Collapse, Divider, Stack, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import ShareIcon from '@mui/icons-material/Share';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ReplayIcon from '@mui/icons-material/Replay';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { StatusChip, PriorityChip } from '../common/Chips';
import WorkflowStepper from './WorkflowStepper';
import { useNow } from '../../hooks/useApi';
import { usePreferences } from '../../hooks/usePreferences';
import { formatCountdown, formatDuration, formatTime } from '../../utils/format';
import { formatShift } from '../../utils/queueText';
import { REJOIN_LIMIT } from '../../config/appConfig';

function Countdown({ deadline, render }) {
  const now = useNow(1000);
  return render(formatCountdown(Date.parse(deadline) - now));
}

export default function TokenCard({ token, actions = {}, pending = null }) {
  const { t, prefs } = usePreferences();
  const [showJourney, setShowJourney] = useState(false);
  const step = token.currentWorkflowStep;
  const isCalled = token.status === 'IN_SERVICE' && step?.status === 'CALLED';
  const isServing = token.status === 'IN_SERVICE' && step?.status === 'IN_PROGRESS';
  const isWaiting = token.status === 'WAITING' && !token.isUpcoming;
  const completed = token.status === 'COMPLETED';
  const missed = token.status === 'MISSED';
  const cancelled = token.status === 'CANCELLED';
  const ahead = token.position ? token.position - 1 : null;
  const busy = (key) => pending === `${key}:${token._id}`;

  return (
    <Card
      sx={{
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        borderColor: isCalled ? 'secondary.main' : undefined,
        borderWidth: isCalled ? 2 : undefined,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header: Ticket Number & Status */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 1,
            mb: 1
          }}>
          <Box sx={{
            minWidth: 0
          }}>
            <Typography
              variant="h5"
              component="p"
              sx={{
                fontWeight: "bold",
                color: "text.primary"
              }}>
              {token.ticketNumber}
              {token.stepNumber > 1 && (
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    ml: 1
                  }}>
                  · {t('token.step', { n: token.stepNumber })}
                </Typography>
              )}
            </Typography>
            {token.holderType === 'DEPENDENT' && (
              <Typography
                variant="body2"
                sx={{
                  color: "secondary.main",
                  fontWeight: 600
                }}>
                {t('token.for', { name: token.holderName })}
                {token.holderRelation ? ` (${t(`relation.${token.holderRelation}`)})` : ''}
              </Typography>
            )}
          </Box>
          <StatusChip token={token} />
        </Box>

        {/* Service & Priority Meta */}
        <Typography variant="body2" gutterBottom sx={{
          color: "text.secondary"
        }}>
          {token.domainName}
          <br />
          <strong>{token.serviceName}</strong>
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            my: 1,
            flexWrap: "wrap"
          }}>
          <PriorityChip tier={token.priorityTier} />
          {token.groupSize > 1 && <Chip label={t('token.group', { n: token.groupSize })} size="small" variant="outlined" />}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* Turn called */}
        {isCalled && (
          <Alert severity="success" variant="filled" sx={{ mb: 1.5 }} role="alert">
            <AlertTitle>{t('token.calledTitle')}</AlertTitle>
            {t('token.calledBody', { counter: step.counterId, service: token.serviceName })}
            {token.noShowDeadline && (
              <Countdown
                deadline={token.noShowDeadline}
                render={(time) => (
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.5,
                      fontWeight: 600
                    }}>
                    {t('token.respondWithin', { time })}
                  </Typography>
                )}
              />
            )}
          </Alert>
        )}
        {isServing && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            {t('token.inProgress', { counter: step.counterId })}
          </Alert>
        )}

        {/* Dynamic Position & Reason Banner */}
        {isWaiting && (
          <Stack direction="row" spacing={3} sx={{
            mb: 1
          }}>
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "text.secondary"
                }}>
                <FormatListNumberedIcon fontSize="small" />
                <Typography variant="caption">{t('token.position')}</Typography>
              </Box>
              <Typography variant="h5" component="p" sx={{
                fontWeight: 700
              }}>
                #{token.position}
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    ml: 0.75
                  }}>
                  {t('token.of', { n: token.queueLength })}
                </Typography>
              </Typography>
            </Box>
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "text.secondary"
                }}>
                <AccessTimeIcon fontSize="small" />
                <Typography variant="caption">{t('token.eta')}</Typography>
              </Box>
              <Typography variant="h5" component="p" sx={{
                fontWeight: 700
              }}>
                ~{formatDuration(token.estimatedWaitMins, { min: t('common.min'), h: t('common.h') })}
              </Typography>
            </Box>
          </Stack>
        )}
        {isWaiting && ahead != null && ahead <= prefs.safeDistance && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {ahead === 0 ? t('token.next') : t('token.safeDistance', { n: ahead })}
          </Alert>
        )}

        {isWaiting && token.shiftSummary && (
          <Box
            sx={{
              bgcolor: "action.hover",
              p: 1,
              borderRadius: 1,
              display: "flex",
              alignItems: "flex-start",
              gap: 0.8,
              mt: 1
            }}>
            <InfoOutlinedIcon fontSize="small" color="info" sx={{ mt: 0.2 }} />
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                flexGrow: 1
              }}>
              {formatShift(t, token.shiftSummary)}
            </Typography>
            {actions.onWhy && (
              <Button size="small" onClick={() => actions.onWhy(token)} sx={{ py: 0, minWidth: 0 }}>
                {t('token.why')}
              </Button>
            )}
          </Box>
        )}

        {/* Preferred arrival slot */}
        {token.isUpcoming && token.scheduledSlot && (
          <Alert severity="info" icon={<AccessTimeIcon />} sx={{ mb: 1 }}>
            <strong>
              {t('token.scheduledFor', { start: formatTime(token.scheduledSlot.startTime), end: formatTime(token.scheduledSlot.endTime) })}
            </strong>
            <Typography variant="body2" sx={{
              mt: 0.5
            }}>
              {token.checkedInAt ? t('token.checkedIn', { start: formatTime(token.scheduledSlot.startTime) }) : t('token.checkInHint')}
            </Typography>
          </Alert>
        )}

        {token.pendingServiceChange && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {t('token.pendingChange', { service: token.pendingServiceChange.toServiceName })}
          </Alert>
        )}

        {missed && (
          <Alert severity="error">
            {token.canRejoin
              ? t('token.missedBody', { left: REJOIN_LIMIT - (token.rejoinCount || 0) })
              : t('token.missedNoRejoin')}
          </Alert>
        )}
        {completed && (
          <Typography variant="body2" sx={{
            color: "success.main"
          }}>
            {t('token.completedBody')}
          </Typography>
        )}
        {cancelled && (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('token.cancelledBody')}
          </Typography>
        )}

        {/* Multi-step journey */}
        {token.workflowHistory?.length > 0 && (
          <Box sx={{
            mt: 1.5
          }}>
            <Button
              size="small"
              onClick={() => setShowJourney((s) => !s)}
              endIcon={<ExpandMoreIcon sx={{ transform: showJourney ? 'rotate(180deg)' : 'none', transition: '.2s' }} />}
              aria-expanded={showJourney}
              sx={{ px: 0 }}
            >
              {t('token.journey')} ({token.workflowHistory.length})
            </Button>
            <Collapse in={showJourney} unmountOnExit>
              <WorkflowStepper steps={token.workflowHistory} />
            </Collapse>
          </Box>
        )}
      </CardContent>

      {Object.keys(actions).length > 0 && (
        <CardActions sx={{ px: 2, pb: 2, pt: 0, flexWrap: 'wrap', gap: 1 }} disableSpacing>
          {token.canCheckIn && actions.onCheckIn && (
            <Button variant="contained" startIcon={<HowToRegIcon />} onClick={() => actions.onCheckIn(token)} loading={busy('checkIn')}>
              {t('token.checkIn')}
            </Button>
          )}
          {token.canRejoin && actions.onRejoin && (
            <Button variant="contained" startIcon={<ReplayIcon />} onClick={() => actions.onRejoin(token)} loading={busy('rejoin')}>
              {t('token.rejoin')}
            </Button>
          )}
          {(isWaiting || isServing) && actions.onShare && (
            <Button size="small" startIcon={<ShareIcon />} onClick={() => actions.onShare(token)}>
              {t('token.share')}
            </Button>
          )}
          {isWaiting && !token.pendingServiceChange && actions.onChangeService && (
            <Button size="small" startIcon={<SwapHorizIcon />} onClick={() => actions.onChangeService(token)}>
              {t('token.changeService')}
            </Button>
          )}
          {['WAITING', 'MISSED'].includes(token.status) && actions.onCancel && (
            <Button size="small" color="error" startIcon={<CloseIcon />} onClick={() => actions.onCancel(token)}>
              {t('token.cancel')}
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
}
