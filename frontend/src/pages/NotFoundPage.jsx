import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';

export default function NotFoundPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        p: 3,
        bgcolor: "background.default"
      }}>
      <Typography
        variant="h2"
        component="h1"
        sx={{
          fontWeight: 800,
          color: "primary.main"
        }}>
        404
      </Typography>
      <Typography variant="h6" gutterBottom>
        This page does not exist.
      </Typography>
      <Button variant="contained" component={RouterLink} to="/">
        Go to WaitLess
      </Button>
    </Box>
  );
}
