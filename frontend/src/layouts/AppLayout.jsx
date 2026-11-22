import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Toolbar,
  Typography,
} from '@mui/material';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import SettingsAccessibilityIcon from '@mui/icons-material/SettingsAccessibility';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TvIcon from '@mui/icons-material/Tv';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutlined';
import InsightsIcon from '@mui/icons-material/Insights';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../hooks/usePreferences';
import { useTurnAlerts } from '../hooks/useTurnAlerts';
import { ROLES } from '../config/appConfig';

const DRAWER_WIDTH = 248;

const NAV = [
  { to: '/my-tokens', key: 'nav.myTokens', icon: <ConfirmationNumberOutlinedIcon />, roles: [ROLES.USER] },
  { to: '/join', key: 'nav.joinQueue', icon: <AddCircleOutlineIcon />, roles: [ROLES.USER] },
  { to: '/dependents', key: 'nav.dependents', icon: <FamilyRestroomIcon />, roles: [ROLES.USER] },
  { to: '/console', key: 'nav.console', icon: <SupportAgentIcon />, roles: [ROLES.MODERATOR, ROLES.ADMIN] },
  { to: '/display', key: 'nav.display', icon: <TvIcon />, roles: [ROLES.MODERATOR, ROLES.ADMIN] },
  { to: '/analytics', key: 'nav.analytics', icon: <InsightsIcon />, roles: [ROLES.MODERATOR, ROLES.ADMIN] },
  { to: '/domains', key: 'nav.domains', icon: <AccountTreeOutlinedIcon />, roles: [ROLES.MODERATOR, ROLES.ADMIN] },
  { to: '/users', key: 'nav.users', icon: <PeopleOutlineIcon />, roles: [ROLES.ADMIN] },
  { to: '/track', key: 'nav.track', icon: <TravelExploreIcon />, roles: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN] },
  { to: '/settings', key: 'nav.settings', icon: <SettingsAccessibilityIcon />, roles: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN] },
];

export default function AppLayout() {
  const { user } = useAuth();
  const t = useT();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  useTurnAlerts(user);

  const items = NAV.filter((n) => n.roles.includes(user?.role));

  const drawer = (
    <Box role="navigation" aria-label="Main">
      <Toolbar />
      <List
        subheader={
          <ListSubheader component="div" sx={{ bgcolor: 'transparent', lineHeight: '36px', mt: 1 }}>
            <Typography variant="overline" sx={{
              color: "text.secondary"
            }}>
              {user?.role === ROLES.USER ? t('app.tagline') : `${user?.role} workspace`}
            </Typography>
          </ListSubheader>
        }
      >
        {items.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            selected={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)}
            onClick={() => setMobileOpen(false)}
            sx={{ mx: 1, borderRadius: 2, mb: 0.25, '&.Mui-selected': { bgcolor: 'action.selected' } }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={t(item.key)} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default"
      }}>
      <Navbar onMenuClick={() => setMobileOpen(true)} />
      <Box sx={{
        display: "flex"
      }}>
        <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            open
            sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
          >
            {drawer}
          </Drawer>
        </Box>
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
          <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 2, sm: 3 } }}>
            <Outlet />
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
