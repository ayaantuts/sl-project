import { Alert, Box, Button, CircularProgress, Paper, Skeleton, Stack, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export function LoadingState({ label = 'Loading…', rows = 0 }) {
  if (rows) {
    return (
      <Stack spacing={1.5} aria-busy="true" aria-label={label}>
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} variant="rounded" height={64} />
        ))}
      </Stack>
    );
  }
  return (
    <Box
      aria-busy="true"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        py: 6
      }}>
      <CircularProgress size={28} />
      <Typography sx={{
        color: "text.secondary"
      }}>{label}</Typography>
    </Box>
  );
}

export function ErrorState({ error, onRetry, retryLabel = 'Try again' }) {
  return (
    <Alert
      severity="error"
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={() => onRetry()}>
            {retryLabel}
          </Button>
        ) : null
      }
    >
      {error?.message || 'Something went wrong'}
    </Alert>
  );
}

export function EmptyState({ title, description, action, icon }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, textAlign: 'center', borderStyle: 'dashed' }}>
      <Box
        sx={{
          color: "text.disabled",
          mb: 1
        }}>
        {icon || <InboxOutlinedIcon sx={{ fontSize: 48 }} />}
      </Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography
          sx={{
            color: "text.secondary",
            mb: action ? 2 : 0
          }}>
          {description}
        </Typography>
      )}
      {action}
    </Paper>
  );
}
