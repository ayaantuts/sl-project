import { Step, StepContent, StepLabel, Stepper, Typography } from '@mui/material';
import { formatTime } from '../../utils/format';

const STEP_STATE = {
  COMPLETED: { completed: true },
  TRANSFERRED: { completed: true },
  MISSED: { error: true },
  CANCELLED: { error: true },
};

/** Multi-step inter-counter journey (Token.workflowHistory). */
export default function WorkflowStepper({ steps, dense = true }) {
  const activeIndex = steps.findIndex((s) => !s.completedAt);
  return (
    <Stepper orientation="vertical" activeStep={activeIndex === -1 ? steps.length : activeIndex} sx={{ mt: 1 }}>
      {steps.map((s, i) => {
        const state = STEP_STATE[s.status] || {};
        return (
          <Step key={s._id || i} completed={Boolean(state.completed)} expanded>
            <StepLabel error={Boolean(state.error)} optional={<Typography variant="caption">{s.status.replace('_', ' ').toLowerCase()}</Typography>}>
              {s.serviceName}
            </StepLabel>
            <StepContent>
              <Typography variant="caption" component="div" sx={{
                color: "text.secondary"
              }}>
                {s.queuedAt && <>Queued {formatTime(s.queuedAt)}</>}
                {s.startedAt && <> · Called {formatTime(s.startedAt)}</>}
                {s.counterId && <> · {s.counterId}</>}
                {s.completedAt && <> · Done {formatTime(s.completedAt)}</>}
              </Typography>
              {s.notes && !dense && (
                <Typography variant="caption" component="div">
                  {s.notes}
                </Typography>
              )}
              {s.notes && dense && (
                <Typography
                  variant="caption"
                  component="div"
                  sx={{
                    color: "text.secondary",
                    fontStyle: "italic"
                  }}>
                  {s.notes}
                </Typography>
              )}
            </StepContent>
          </Step>
        );
      })}
    </Stepper>
  );
}
