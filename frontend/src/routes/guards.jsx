import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { homePathFor } from './homePath';

function FullPageSpinner() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
      <CircularProgress aria-label="Loading" />
    </Box>
  );
}

/** Requires a signed-in user; optionally restricts to `roles` (mirrors backend `authorize`). */
export function RequireAuth({ roles, children }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return children || <Outlet />;
}

/** Login / register pages: signed-in users go to their home page. */
export function GuestOnly({ children }) {
  const { user, status } = useAuth();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to={homePathFor(user.role)} replace />;
  return children || <Outlet />;
}

export function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={homePathFor(user?.role)} replace />;
}
