import { createTheme } from "@mui/material/styles";

export const lightTheme = createTheme({
  palette: {
    primary: {
      main: "#00A0B0", // Teal - primary brand color
      light: "#4FD1D9",
      dark: "#00717D",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#6A8EAE", // Soft blue - secondary brand color
      light: "#9BBDD7",
      dark: "#4A6282",
      contrastText: "#FFFFFF",
    },
    error: {
      main: "#F44336", // Red - error states
    },
    warning: {
      main: "#FF9800", // Orange - warning states
    },
    success: {
      main: "#4CAF50", // Green - success states
    },
    info: {
      main: "#2196F3", // Blue - info states
    },
    background: {
      default: "#F5F7FA", // Light gray-blue background
      paper: "#FFFFFF",
    },
    text: {
      primary: "#212121", // Dark gray for primary text
      secondary: "#424242", // Medium gray for secondary text
    },
    status: {
      inUse: "#4CAF50", // Green
      available: "#2196F3", // Blue
      maintenance: "#FF9800", // Orange
      error: "#F44336", // Red
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "2rem",
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: "1.75rem",
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h4: {
      fontSize: "1.25rem",
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h5: {
      fontSize: "1.1rem",
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 600,
      lineHeight: 1.2,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.5,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
    button: {
      textTransform: "none", // Avoid all-caps buttons
    },
  },
  shape: {
    borderRadius: 8, // Slightly rounded corners
  },
  spacing: 8, // Base spacing unit of 8px
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 16px",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:nth-of-type(odd)": {
            backgroundColor: "rgba(0, 160, 176, 0.04)",
          },
        },
      },
    },
  },
});

// Optional dark theme
export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#00A0B0",
      light: "#4FD1D9",
      dark: "#00717D",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#6A8EAE",
      light: "#9BBDD7",
      dark: "#4A6282",
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#121212",
      paper: "#1E1E1E",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#B0B0B0",
    },
    status: {
      inUse: "#66BB6A", // Green
      available: "#42A5F5", // Blue
      maintenance: "#FFA726", // Orange
      error: "#EF5350", // Red
    },
  },
  // Inherit other properties from light theme
  typography: lightTheme.typography,
  shape: lightTheme.shape,
  spacing: lightTheme.spacing,
  components: {
    ...lightTheme.components,
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
          borderRadius: 12,
        },
      },
    },
  },
});
