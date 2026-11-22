import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

/** Centered card layout for login / register / public tracking. */
export default function AuthLayout({ children, maxWidth = 'xs' }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column"
      }}>
      <Navbar />
      <Container maxWidth={maxWidth} sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4, px: 2 }}>
        <Stack
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 3
          }}>
          <ConfirmationNumberIcon color="primary" sx={{ fontSize: 44 }} />
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              textAlign: "center"
            }}>
            Smart virtual queuing &amp; workflow orchestration
          </Typography>
        </Stack>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
          {children || <Outlet />}
        </Paper>
      </Container>
    </Box>
  );
}
