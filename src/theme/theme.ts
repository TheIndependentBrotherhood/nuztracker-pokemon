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
          padding: "12px 32px",
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
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: "1.5rem",
            backgroundColor: "#ffffff",
            border: "2px solid #000000",
            "& fieldset": {
              border: "none",
            },
            "&:hover": {
              backgroundColor: "#ffffff",
            },
            "&.Mui-focused": {
              backgroundColor: "#ffffff",
              "& fieldset": {
                border: "none",
              },
            },
          },
          "& .MuiOutlinedInput-input": {
            color: "#000000",
            fontWeight: 500,
            "&::placeholder": {
              color: "#a0a0a0",
              opacity: 1,
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: "1.5rem",
          backgroundColor: "#ffffff",
          border: "2px solid #000000",
          color: "#000000",
          fontWeight: 600,
          "& .MuiOutlinedInput-notchedOutline": {
            border: "none",
          },
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
