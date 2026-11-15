import { Box, Stack, Typography } from '@mui/material';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{
        justifyContent: "space-between",
        alignItems: { xs: 'stretch', sm: 'flex-end' },
        mb: 3
      }}>
      <Box sx={{
        minWidth: 0
      }}>
        <Typography variant="h4" component="h1" gutterBottom={Boolean(subtitle)} sx={{ fontSize: { xs: '1.6rem', md: '2.1rem' } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" sx={{
            color: "text.secondary"
          }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexShrink: 0,
            flexWrap: "wrap"
          }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
