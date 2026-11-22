import { Box, Stack, Typography } from '@mui/material';

/**
 * Minimal horizontal bar chart (no charting dependency).
 * items: [{ label, value, highlight?, caption? }]
 */
export default function BarList({ items, valueFormatter = (v) => v, emptyLabel = 'No data yet' }) {
  const max = Math.max(1, ...items.map((i) => i.value || 0));
  if (!items.length) {
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {emptyLabel}
      </Typography>
    );
  }
  return (
    <Stack spacing={1.25} role="list">
      {items.map((item) => (
        <Box key={item.label} role="listitem">
          <Stack
            direction="row"
            spacing={1}
            sx={{
              justifyContent: "space-between",
              mb: 0.5
            }}>
            <Typography variant="body2" noWrap title={item.label}>
              {item.label}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                flexShrink: 0
              }}>
              {valueFormatter(item.value)}
              {item.caption && (
                <Typography
                  component="span"
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    ml: 0.75
                  }}>
                  {item.caption}
                </Typography>
              )}
            </Typography>
          </Stack>
          <Box sx={{ height: 10, borderRadius: 5, bgcolor: 'action.hover', overflow: 'hidden' }}>
            <Box
              sx={{
                height: '100%',
                width: `${((item.value || 0) / max) * 100}%`,
                bgcolor: item.highlight ? 'error.main' : 'primary.main',
                borderRadius: 5,
                transition: 'width .4s ease',
              }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
