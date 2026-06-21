import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#65d6ad',
      contrastText: '#071815',
    },
    secondary: {
      main: '#e0b95c',
    },
    error: {
      main: '#ff8a80',
    },
    warning: {
      main: '#f6c85f',
    },
    success: {
      main: '#7bd88f',
    },
    background: {
      default: '#071815',
      paper: '#102522',
    },
    text: {
      primary: '#edf7f2',
      secondary: '#b5c7bf',
    },
  },
  typography: {
    fontFamily: '"Space Grotesk", "IBM Plex Sans", system-ui, sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 650,
    },
    button: {
      textTransform: 'none',
      fontWeight: 650,
    },
  },
  shape: {
    borderRadius: 8,
  },
});
