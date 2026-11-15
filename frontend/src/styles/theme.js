import { createTheme } from '@mui/material';

export function createAppTheme({ highContrast = false } = {}) {
  const base = {
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Inter", "Roboto", "Noto Sans Devanagari", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.01em' },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiCard: { defaultProps: { variant: 'outlined' } },
      MuiPaper: { styleOverrides: { outlined: { borderColor: highContrast ? '#000' : undefined } } },
      MuiTableCell: { styleOverrides: { head: { fontWeight: 600 } } },
      MuiChip: { styleOverrides: { label: { fontWeight: 600 } } },
    },
  };

  if (highContrast) {
    return createTheme({
      ...base,
      palette: {
        mode: 'light',
        primary: { main: '#0000b3' },
        secondary: { main: '#5c007a' },
        success: { main: '#005a00' },
        warning: { main: '#7a4a00' },
        error: { main: '#a50000' },
        info: { main: '#004f80' },
        text: { primary: '#000', secondary: '#1a1a1a' },
        divider: '#000',
        background: { default: '#fff', paper: '#fff' },
      },
      components: {
        ...base.components,
        MuiCard: { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { borderWidth: 2, borderColor: '#000' } } },
        MuiButtonBase: { styleOverrides: { root: { '&.Mui-focusVisible': { outline: '3px solid #000', outlineOffset: 2 } } } },
      },
    });
  }

  return createTheme({
    ...base,
    palette: {
      mode: 'light',
      primary: { main: '#1976d2' },
      secondary: { main: '#9c27b0' },
      background: { default: '#f8fafc', paper: '#fff' },
    },
  });
}
