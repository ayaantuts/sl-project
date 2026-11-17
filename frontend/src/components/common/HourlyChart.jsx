import { Box, Stack, Tooltip, Typography } from '@mui/material';

/** Vertical bars for tokens issued per hour (peak-hour traffic). rows: [{ label, count }] */
export default function HourlyChart({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const peak = rows.reduce((best, r) => (r.count > (best?.count ?? -1) ? r : best), null);
  if (!rows.length) return (
    <Typography sx={{
      color: "text.secondary"
    }}>No traffic recorded yet.</Typography>
  );
  return (
    <Box>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          alignItems: "flex-end",
          height: 160,
          overflowX: 'auto',
          pb: 1.5
        }}>
        {rows.map((r) => (
          <Tooltip key={r.label} title={`${r.label}: ${r.count} tokens`} arrow>
            <Stack
              sx={{
                alignItems: "center",
                justifyContent: "flex-end",
                minWidth: 10,
                flex: 1,
                height: '100%'
              }}>
              <Typography variant="caption" sx={{
                fontWeight: 600
              }}>
                {r.count || ''}
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  height: `${(r.count / max) * 120}px`,
                  minHeight: r.count ? 4 : 0,
                  bgcolor: r === peak ? 'secondary.main' : 'primary.light',
                  borderRadius: '4px 4px 0 0',
                }}
              />
            </Stack>
          </Tooltip>
        ))}
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ overflowX: 'auto' }}>
        {rows.map((r) => (
          <Typography
            key={r.label}
            variant="caption"
            sx={{
              color: "text.secondary",
              minWidth: 10,
              flex: 1,
              textAlign: 'center'
            }}>
            {r.label.slice(0, 2)}
          </Typography>
        ))}
      </Stack>
      {peak && (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mt: 1
          }}>
          Peak hour: <strong>{peak.label}</strong> ({peak.count} tokens)
        </Typography>
      )}
    </Box>
  );
}
