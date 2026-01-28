import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#79f2c0',
      contrastText: '#0b1c1a',
    },
    secondary: {
      main: '#f2d479',
    },
    background: {
      default: 'transparent',
      paper: 'rgba(10, 24, 22, 0.7)',
    },
    text: {
      primary: '#f2f7f4',
      secondary: '#b9c7c0',
    },
  },
  typography: {
    fontFamily: '"Space Grotesk", "IBM Plex Sans", system-ui, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
});
