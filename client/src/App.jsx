import { useEffect, useState } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import { wakeUpBackend } from "./services/garminApi";
import {
  clearSession,
  hasStoredSession,
  storeSession,
} from "./services/sessionRouting";

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
  const navigate = useNavigate();
  const location = useLocation();
  const [hasSession, setHasSession] = useState(() => hasStoredSession(localStorage));

  useEffect(() => {
    if (location.pathname === "/login" || location.pathname === "/dashboard") {
      wakeUpBackend().catch((error) => {
        console.warn("No se pudo despertar el backend:", error);
      });
    }
  }, [location.pathname]);

  const handleLoginSuccess = () => {
    storeSession(localStorage);
    setHasSession(true);
    navigate("/dashboard", { replace: true });
  };

  const handleLogout = () => {
    clearSession(localStorage);
    setHasSession(false);
    navigate("/login", { replace: true });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<LandingPage hasSession={hasSession} />} />
        <Route
          path="/login"
          element={
            hasSession ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            hasSession ? (
              <DashboardPage onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
