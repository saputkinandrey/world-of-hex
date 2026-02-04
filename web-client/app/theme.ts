import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2a6f6a",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#d08a00",
    },
    background: {
      default: "transparent",
      paper: "#ffffff",
    },
    text: {
      primary: "#1d1b16",
      secondary: "#6b6258",
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h3: {
      fontWeight: 600,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
});
