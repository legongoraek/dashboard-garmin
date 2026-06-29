import { useEffect, useState } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    background: {
      default: "#f5f7fb",
    },
  },
  shape: {
    borderRadius: 14,
  },
});

export default function App() {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("garmin_session");
    setHasSession(session === "true");
  }, []);

  const handleLoginSuccess = () => {
    localStorage.setItem("garmin_session", "true");
    setHasSession(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("garmin_session");
    setHasSession(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {hasSession ? (
        <DashboardPage onLogout={handleLogout} />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </ThemeProvider>
  );
}