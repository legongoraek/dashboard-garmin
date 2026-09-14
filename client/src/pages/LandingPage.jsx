import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import DirectionsRunRounded from "@mui/icons-material/DirectionsRunRounded";
import FavoriteRounded from "@mui/icons-material/FavoriteRounded";
import InsightsRounded from "@mui/icons-material/InsightsRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import MapRounded from "@mui/icons-material/MapRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import RouteRounded from "@mui/icons-material/RouteRounded";
import SecurityRounded from "@mui/icons-material/SecurityRounded";
import { Link as RouterLink } from "react-router-dom";

const capabilities = [
  {
    icon: <DirectionsRunRounded fontSize="large" color="primary" />,
    title: "Actividad",
    description:
      "Pasos, calorías, distancia y actividades recientes en una vista centralizada.",
  },
  {
    icon: <FavoriteRounded fontSize="large" color="primary" />,
    title: "Salud",
    description:
      "Sueño, frecuencia cardiaca, estrés, Body Battery y HRV cuando Garmin Connect dispone de esos datos.",
  },
  {
    icon: <InsightsRounded fontSize="large" color="primary" />,
    title: "Entrenamiento",
    description:
      "Readiness, minutos de intensidad y resúmenes semanales para contextualizar la carga de entrenamiento.",
  },
  {
    icon: <MapRounded fontSize="large" color="primary" />,
    title: "Rutas y mapas",
    description:
      "Visualización geográfica de actividades y heatmaps mediante Leaflet cuando existen coordenadas disponibles.",
  },
];

const stack = [
  "React 19",
  "Vite 8",
  "Material UI",
  "Leaflet",
  "Node.js",
  "Garmin Connect",
];

export default function LandingPage({ hasSession = false }) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb", color: "text.primary" }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          bgcolor: "rgba(245, 247, 251, 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 } }}>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ flexGrow: 1 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2.5,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                }}
              >
                <RouteRounded fontSize="small" />
              </Box>
              <Typography variant="h6" fontWeight={800}>
                Garmin Dashboard
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ display: { xs: "none", md: "flex" } }}
            >
              <Button href="#capacidades" color="inherit">
                Capacidades
              </Button>
              <Button href="#tecnologia" color="inherit">
                Tecnología
              </Button>
              <Button href="#privacidad" color="inherit">
                Privacidad
              </Button>
              <Button
                component={RouterLink}
                to={hasSession ? "/dashboard" : "/login"}
                variant="contained"
              >
                {hasSession ? "Ir al dashboard" : "Iniciar sesión"}
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Box component="main">
        <Box
          component="section"
          id="inicio"
          sx={{
            position: "relative",
            overflow: "hidden",
            py: { xs: 8, md: 13 },
            background:
              "radial-gradient(circle at 80% 20%, rgba(25,118,210,0.16), transparent 34%), linear-gradient(180deg, #ffffff 0%, #f5f7fb 100%)",
          }}
        >
          <Container maxWidth="lg">
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={{ xs: 6, md: 8 }}
              alignItems="center"
            >
              <Stack spacing={3} sx={{ flex: 1, textAlign: { xs: "center", md: "left" } }}>
                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent={{ xs: "center", md: "flex-start" }}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Chip label="Proyecto independiente" color="primary" variant="outlined" />
                  <Chip label="React + Vite" variant="outlined" />
                </Stack>

                <Typography
                  component="h1"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.05,
                    fontSize: { xs: "2.6rem", sm: "3.6rem", md: "4.5rem" },
                    maxWidth: 820,
                  }}
                >
                  Tu información de Garmin Connect, en una vista creada para entenderla mejor.
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{ fontSize: { xs: "1.05rem", md: "1.25rem" }, maxWidth: 720 }}
                >
                  Dashboard web independiente para explorar actividad, salud, entrenamiento y rutas
                  desde una interfaz clara y centralizada.
                </Typography>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  justifyContent={{ xs: "center", md: "flex-start" }}
                >
                  <Button
                    component={RouterLink}
                    to={hasSession ? "/dashboard" : "/login"}
                    variant="contained"
                    size="large"
                  >
                    {hasSession ? "Ir al dashboard" : "Iniciar sesión"}
                  </Button>
                  <Button
                    component="a"
                    href="https://github.com/legongoraek/dashboard-garmin"
                    target="_blank"
                    rel="noreferrer"
                    variant="outlined"
                    size="large"
                    endIcon={<OpenInNewRounded />}
                  >
                    Ver código fuente
                  </Button>
                </Stack>
              </Stack>

              <Card
                elevation={0}
                sx={{
                  flex: { xs: "none", md: "0 0 390px" },
                  width: { xs: "100%", md: 390 },
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 5,
                  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.10)",
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Stack spacing={2.5}>
                    <Typography variant="overline" color="primary.main" fontWeight={800}>
                      Qué centraliza
                    </Typography>
                    {[
                      ["Actividad diaria", "Pasos, calorías, distancia y frecuencia cardiaca"],
                      ["Recuperación", "Sueño, HRV, estrés, Body Battery y Readiness"],
                      ["Entrenamiento", "Actividades recientes y resumen semanal"],
                      ["Geografía", "Rutas y heatmap de actividad"],
                    ].map(([title, text]) => (
                      <Stack key={title} direction="row" spacing={1.5}>
                        <Box
                          sx={{
                            mt: 0.4,
                            width: 9,
                            height: 9,
                            borderRadius: "50%",
                            bgcolor: "primary.main",
                            flexShrink: 0,
                          }}
                        />
                        <Box>
                          <Typography fontWeight={800}>{title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {text}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Container>
        </Box>

        <Box component="section" id="capacidades" sx={{ py: { xs: 8, md: 11 } }}>
          <Container maxWidth="lg">
            <Stack spacing={5}>
              <Box sx={{ maxWidth: 760 }}>
                <Typography variant="overline" color="primary.main" fontWeight={800}>
                  Capacidades reales del proyecto
                </Typography>
                <Typography variant="h3" fontWeight={900} sx={{ mt: 1, mb: 2 }}>
                  Datos útiles sin convertir el dashboard en una caja negra.
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: "1.1rem" }}>
                  La interfaz reúne información ya disponible en Garmin Connect y la presenta de
                  forma más compacta para consulta personal.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                  gap: 2.5,
                }}
              >
                {capabilities.map((item) => (
                  <Card
                    key={item.title}
                    elevation={0}
                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 4 }}
                  >
                    <CardContent sx={{ p: 3.5 }}>
                      <Stack spacing={2}>
                        {item.icon}
                        <Typography variant="h5" fontWeight={850}>
                          {item.title}
                        </Typography>
                        <Typography color="text.secondary">{item.description}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Stack>
          </Container>
        </Box>

        <Box component="section" id="tecnologia" sx={{ py: { xs: 8, md: 11 }, bgcolor: "white" }}>
          <Container maxWidth="lg">
            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 5, md: 9 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" color="primary.main" fontWeight={800}>
                  Implementación técnica
                </Typography>
                <Typography variant="h3" fontWeight={900} sx={{ mt: 1, mb: 2 }}>
                  Una aplicación web completa, no sólo una visualización estática.
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: "1.1rem" }}>
                  El frontend consulta un backend dedicado para acceder a Garmin Connect, mantiene
                  una sesión local ligera y soporta el flujo MFA cuando Garmin lo solicita. El mapa
                  de entrenamiento utiliza Leaflet y heatmaps para representar puntos geográficos
                  de actividades.
                </Typography>
              </Box>

              <Stack spacing={3} sx={{ flex: 1 }}>
                <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                  {stack.map((technology) => (
                    <Chip key={technology} label={technology} sx={{ fontWeight: 700 }} />
                  ))}
                </Stack>

                <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <SecurityRounded color="primary" />
                        <Typography variant="h6" fontWeight={800}>
                          Autenticación y MFA
                        </Typography>
                      </Stack>
                      <Typography color="text.secondary">
                        El login se mantiene separado de la landing pública y conserva el soporte
                        para código MFA cuando Garmin Connect lo requiere.
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Stack>
          </Container>
        </Box>

        <Box component="section" id="privacidad" sx={{ py: { xs: 8, md: 11 } }}>
          <Container maxWidth="md">
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 5,
                bgcolor: "#0f172a",
                color: "common.white",
              }}
            >
              <CardContent sx={{ p: { xs: 4, md: 5 } }}>
                <Stack spacing={2.5}>
                  <LockRounded sx={{ fontSize: 42, color: "#90caf9" }} />
                  <Typography variant="h3" fontWeight={900}>
                    La landing es pública. Tus datos no.
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.78)", fontSize: "1.08rem" }}>
                    La landing pública no consulta ni muestra información privada de Garmin. Los
                    datos personales sólo se solicitan dentro del área autenticada.
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.68)" }}>
                    Proyecto independiente. Garmin Dashboard no es un producto oficial de Garmin ni
                    está presentado como una aplicación respaldada por Garmin.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Container>
        </Box>

        <Box component="section" id="acceso" sx={{ py: { xs: 8, md: 11 }, bgcolor: "white" }}>
          <Container maxWidth="md">
            <Stack spacing={3} alignItems="center" textAlign="center">
              <Typography variant="h3" fontWeight={900}>
                Explora la implementación o entra a tu dashboard.
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 680, fontSize: "1.1rem" }}>
                El proyecto está pensado como una implementación técnica visible: puedes revisar el
                código fuente y, si ya tienes una sesión válida, acceder directamente al dashboard.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  component={RouterLink}
                  to={hasSession ? "/dashboard" : "/login"}
                  variant="contained"
                  size="large"
                >
                  {hasSession ? "Ir al dashboard" : "Iniciar sesión"}
                </Button>
                <Button
                  component="a"
                  href="https://github.com/legongoraek/dashboard-garmin"
                  target="_blank"
                  rel="noreferrer"
                  variant="outlined"
                  size="large"
                  endIcon={<OpenInNewRounded />}
                >
                  GitHub
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Box>
      </Box>

      <Box component="footer" sx={{ py: 4, borderTop: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Typography variant="body2" color="text.secondary">
              Garmin Dashboard · Proyecto web independiente
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Actividad · Salud · Entrenamiento · Rutas
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
