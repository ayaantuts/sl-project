import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Select,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import MenuIcon from '@mui/icons-material/Menu';
import ContrastIcon from '@mui/icons-material/Contrast';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import TranslateIcon from '@mui/icons-material/Translate';
import { useAuth } from '../hooks/useAuth';
import { usePreferences } from '../hooks/usePreferences';
import { LANGUAGES } from '../i18n/translations';
import { initials } from '../utils/format';

/** Top application bar: brand, status, language, high contrast, account menu. */
export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { prefs, setPref, t } = usePreferences();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const compact = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  return (
    <AppBar position="sticky" color="default" elevation={1} sx={{ bgcolor: 'background.paper', zIndex: (th) => th.zIndex.drawer + 1 }}>
      <Toolbar sx={{ gap: 1 }}>
        {onMenuClick && (
          <IconButton edge="start" onClick={onMenuClick} aria-label="Open navigation" sx={{ display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
        )}
        <ConfirmationNumberIcon color="primary" sx={{ mr: 0.5 }} />
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', flexGrow: 1 }} noWrap>
          WaitLess
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1
          }}>
          <Chip label="Live" color="success" size="small" variant="outlined" sx={{ display: { xs: 'none', sm: 'flex' } }} />
          <Select
            size="small"
            value={prefs.language}
            onChange={(e) => setPref('language', e.target.value)}
            aria-label={t('settings.language')}
            startAdornment={<TranslateIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />}
            sx={{ minWidth: { xs: 72, sm: 120 }, '& .MuiSelect-select': { py: 0.75 } }}
            renderValue={(v) => (compact ? v.toUpperCase() : LANGUAGES.find((l) => l.code === v)?.label)}
          >
            {LANGUAGES.map((l) => (
              <MenuItem key={l.code} value={l.code}>
                {l.label}
              </MenuItem>
            ))}
          </Select>
          <Tooltip title={t('settings.highContrast')}>
            <IconButton
              onClick={() => setPref('highContrast', !prefs.highContrast)}
              color={prefs.highContrast ? 'primary' : 'default'}
              aria-pressed={prefs.highContrast}
              aria-label={t('settings.highContrast')}
            >
              <ContrastIcon />
            </IconButton>
          </Tooltip>
          {user && (
            <>
              <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Account menu" sx={{ p: 0.5 }}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>{initials(user.name)}</Avatar>
              </IconButton>
              <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                <Box
                  sx={{
                    px: 2,
                    py: 1
                  }}>
                  <Typography sx={{
                    fontWeight: 600
                  }}>{user.name}</Typography>
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>
                    {user.email} · {user.role}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setAnchor(null);
                    navigate('/settings');
                  }}
                >
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  {t('nav.settings')}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setAnchor(null);
                    logout();
                    navigate('/login');
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  {t('nav.logout')}
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}