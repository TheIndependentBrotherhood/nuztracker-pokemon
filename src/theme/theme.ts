import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#10b981",
      light: "#34d399",
      dark: "#059669",
    },
    secondary: {
      main: "#0ea5e9",
      light: "#38bdf8",
      dark: "#0284c7",
    },
    success: {
      main: "#10b981",
      light: "#34d399",
      dark: "#059669",
    },
    warning: {
      main: "#ff9800",
      light: "#ffc147",
      dark: "#f57c00",
    },
    error: {
      main: "#ef4444",
      light: "#f87171",
      dark: "#dc2626",
    },
    background: {
      default: "#f9d56e",
      paper: "#FEF3E2",
    },
    text: {
      primary: "#000000",
      secondary: "#4b5563",
    },
  },
  typography: {
    fontFamily:
      '"Fredoka", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontSize: "3.5rem",
      fontWeight: 900,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 800,
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: 800,
    },
    button: {
      fontWeight: 700,
      textTransform: "none",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxSizing: "border-box",
          borderRadius: "9999px",
          border: "3px solid #000000",
          boxShadow: "4px 6px 0 rgba(0, 0, 0, 0.1)",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "translate(-2px, -2px)",
            boxShadow: "6px 8px 0 rgba(0, 0, 0, 0.15)",
          },
          "&:active": {
            transform: "translate(1px, 1px)",
            boxShadow: "2px 4px 0 rgba(0, 0, 0, 0.1)",
          },
        },
        contained: {
          color: "#ffffff",
          fontWeight: 700,
          "&.MuiButton-containedPrimary": {
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          },
          "&.MuiButton-containedSecondary": {
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
          },
        },
        outlined: {
          border: "3px solid #000000",
          color: "#000000",
          fontWeight: 700,
        },
        sizeSmall: {
          minHeight: 32,
          padding: "4px 12px",
          fontSize: "0.8125rem",
          lineHeight: "18px",
        },
        sizeMedium: {
          minHeight: 40,
          padding: "6px 16px",
          fontSize: "0.875rem",
          lineHeight: "20px",
        },
        sizeLarge: {
          minHeight: 48,
          padding: "8px 24px",
          fontSize: "1rem",
          lineHeight: "22px",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "3px solid #000000",
          borderRadius: "1.5rem",
          boxShadow: "0 10px 0 rgba(0, 0, 0, 0.05)",
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            boxShadow: "0 15px 0 rgba(0, 0, 0, 0.1)",
            transform: "scale(1.05)",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: "1rem",
          backgroundColor: "#ffffff",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#000000",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#059669",
          },
        },
        notchedOutline: {
          border: "2px solid #000000",
        },
        input: {
          color: "#000000",
          fontWeight: 500,
          "&::placeholder": {
            color: "#737373",
            opacity: 1,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          color: "#000000",
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});
