import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, CssBaseline, Snackbar, ThemeProvider } from '@mui/material';
import { AuthContext, NotifyContext, PreferencesContext } from './contexts';
import { STORAGE_KEYS, DEFAULT_SAFE_DISTANCE } from '../config/appConfig';
import { storage } from '../utils/storage';
import { translate, LANGUAGES } from '../i18n/translations';
import { createAppTheme } from '../styles/theme';
import { speak, vibrate } from '../utils/announce';
import * as authService from '../services/api/authService';

// preferences (language, a11y)
const DEFAULT_PREFS = {
  language: 'en',
  highContrast: false,
  tts: true,
  vibration: true,
  safeDistance: DEFAULT_SAFE_DISTANCE,
};

function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(() => ({ ...DEFAULT_PREFS, ...storage.get(STORAGE_KEYS.preferences, {}) }));

  const setPref = useCallback((key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      storage.set(STORAGE_KEYS.preferences, next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = prefs.language;
  }, [prefs.language]);

  const value = useMemo(() => {
    const t = (key, vars) => translate(prefs.language, key, vars);
    const speechLang = LANGUAGES.find((l) => l.code === prefs.language)?.speech || 'en-IN';
    return {
      prefs,
      setPref,
      t,
      alertUser: (text, { haptic = true } = {}) => {
        if (prefs.tts) speak(text, speechLang);
        if (haptic && prefs.vibration) vibrate();
      },
      speakText: (text) => speak(text, speechLang),
    };
  }, [prefs, setPref]);

  const theme = useMemo(() => createAppTheme({ highContrast: prefs.highContrast }), [prefs.highContrast]);

  return (
    <PreferencesContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </PreferencesContext.Provider>
  );
}

// snackbar notifications
function NotifyProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const current = queue[0];

  const notify = useCallback((message, severity = 'success') => {
    setQueue((q) => [...q, { key: Date.now() + Math.random(), message, severity }]);
  }, []);

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setQueue((q) => q.slice(1));
  };

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        key={current?.key}
        open={Boolean(current)}
        autoHideDuration={current?.severity === 'error' ? 6000 : 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {current ? (
          <Alert onClose={handleClose} severity={current.severity} variant="filled" sx={{ width: '100%' }}>
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotifyContext.Provider>
  );
}

// authentication
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (authService.hasStoredSession() ? 'loading' : 'anonymous'));

  useEffect(() => {
    if (status !== 'loading') return;
    let cancelled = false;
    authService
      .getMe()
      .then(({ user: me }) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        authService.logout();
        setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const login = useCallback(async (credentials) => {
    const { user: me } = await authService.login(credentials);
    setUser(me);
    setStatus('authenticated');
    return me;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default function AppProviders({ children }) {
  return (
    <PreferencesProvider>
      <NotifyProvider>
        <AuthProvider>{children}</AuthProvider>
      </NotifyProvider>
    </PreferencesProvider>
  );
}
