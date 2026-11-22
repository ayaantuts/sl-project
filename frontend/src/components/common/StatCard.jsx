import { Card, CardContent, Stack, Typography, Box } from '@mui/material';

export default function StatCard({ label, value, hint, icon, color = 'primary.main' }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: "flex-start"
          }}>
          <Box sx={{
            minWidth: 0
          }}>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {label}
            </Typography>
            <Typography variant="h4" component="p" sx={{ fontSize: { xs: '1.6rem', md: '2rem' }, mt: 0.5 }}>
              {value}
            </Typography>
            {hint && (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {hint}
              </Typography>
            )}
          </Box>
          {icon && <Box sx={{ color }}>{icon}</Box>}
        </Stack>
      </CardContent>
    </Card>
  );
}
