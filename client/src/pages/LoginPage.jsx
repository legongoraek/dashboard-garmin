import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { loginGarmin, loginGarminMfa } from "../services/garminApi";

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleLogin = async () => {
    const errors = {};
    if (!email.trim()) errors.email = "Ingresa tu email de Garmin";
    if (!password) errors.password = "Ingresa tu password de Garmin";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setLoading(true);
      setError("");

      const result = await loginGarmin(email, password);

      if (result.requiresMfa) {
        setRequiresMfa(true);
        return;
      }

      if (result.ok) {
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async () => {
    if (!mfaCode.trim()) {
      setFieldErrors({ mfaCode: "Ingresa el código MFA" });
      return;
    }
    setFieldErrors({});

    try {
      setLoading(true);
      setError("");

      const result = await loginGarminMfa(email, password, mfaCode);

      if (result.ok) {
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || "No se pudo validar el código MFA");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        background: "linear-gradient(135deg, #e3f2fd, #f5f7fb)",
      }}
    >
      <Container maxWidth="sm">
        <Card elevation={0} sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h4" fontWeight={800}>
                  Garmin Dashboard
                </Typography>

                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Inicia sesión para consultar tu información de Garmin Connect.
                </Typography>
              </Box>

              {error && <Alert severity="error">{error}</Alert>}

              {!requiresMfa ? (
                <>
                  <TextField
                    label="Email Garmin"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    error={Boolean(fieldErrors.email)}
                    helperText={fieldErrors.email}
                    fullWidth
                  />

                  <TextField
                    label="Password Garmin"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    error={Boolean(fieldErrors.password)}
                    helperText={fieldErrors.password}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              type="button"
                              aria-label={
                                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                              }
                              aria-pressed={showPassword}
                              edge="end"
                              onClick={() => setShowPassword((visible) => !visible)}
                              onMouseDown={(event) => event.preventDefault()}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                    fullWidth
                  />

                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleLogin}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : "Iniciar sesión"}
                  </Button>
                </>
              ) : (
                <>
                  <Alert severity="info">
                    Garmin requiere código MFA. Revisa tu correo e ingresa el código.
                  </Alert>

                  <TextField
                    label="Código MFA"
                    value={mfaCode}
                    onChange={(e) => {
                      setMfaCode(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, mfaCode: undefined }));
                    }}
                    error={Boolean(fieldErrors.mfaCode)}
                    helperText={fieldErrors.mfaCode}
                    fullWidth
                  />

                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleMfa}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : "Validar código"}
                  </Button>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
