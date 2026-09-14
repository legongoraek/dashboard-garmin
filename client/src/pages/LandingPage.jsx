import {
  AppBar,
  Box,
  Button,
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
import SecurityRounded from "@mui/icons-material/SecurityRounded";
import { Link as RouterLink } from "react-router-dom";

const ink = "#0B1210";
const panel = "#121B18";
const hairline = "rgba(232, 205, 160, 0.14)";
const trail = "#E8CDA0";
const pulse = "#FF6B4A";
const paper = "#F2EFE6";
const mist = "#93A69C";

const display = '"Big Shoulders Display", "Arial Narrow", sans-serif';
const body = '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif';
const mono = '"IBM Plex Mono", "SFMono-Regular", Menlo, monospace';

const capabilities = [
  {
    icon: <DirectionsRunRounded sx={{ color: trail }} />,
    title: "Actividad",
    description:
      "Pasos, calorías, distancia y actividades recientes en una vista centralizada.",
  },
  {
    icon: <FavoriteRounded sx={{ color: pulse }} />,
    title: "Salud",
    description:
      "Sueño, frecuencia cardiaca, estrés, Body Battery y HRV cuando Garmin Connect dispone de esos datos.",
  },
  {
    icon: <InsightsRounded sx={{ color: trail }} />,
    title: "Entrenamiento",
    description:
      "Readiness, minutos de intensidad y resúmenes semanales para contextualizar la carga de entrenamiento.",
  },
  {
    icon: <MapRounded sx={{ color: pulse }} />,
    title: "Rutas y mapas",
    description:
      "Visualización geográfica de actividades y heatmaps mediante Leaflet cuando existen coordenadas disponibles.",
  },
];

const stack = ["React 19", "Vite 8", "Material UI", "Leaflet", "Node.js", "Garmin Connect"];

function ElevationProfile() {
  return (
    <Box
      component="svg"
      viewBox="0 0 560 340"
      role="img"
      aria-label="Perfil de elevación estilizado de una ruta de entrenamiento"
      sx={{ width: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={pulse} stopOpacity="0.35" />
          <stop offset="55%" stopColor={trail} stopOpacity="0.16" />
          <stop offset="100%" stopColor={trail} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* topographic echoes */}
      <path
        d="M0,300 C50,280 70,230 110,238 C150,246 160,180 200,172 C240,164 260,220 300,212 C340,204 360,150 400,142 C440,134 470,190 510,198 C540,204 552,180 560,176"
        fill="none"
        stroke={hairline}
        strokeWidth="1.5"
      />
      <path
        d="M0,318 C50,300 70,258 110,264 C150,270 160,214 200,208 C240,202 260,248 300,242 C340,236 360,192 400,186 C440,180 470,224 510,230 C540,235 552,215 560,212"
        fill="none"
        stroke={hairline}
        strokeWidth="1.5"
      />

      {/* main profile */}
      <path
        d="M0,262 C40,242 60,182 100,192 C140,202 150,122 190,112 C230,102 250,182 290,172 C330,162 350,82 390,72 C430,62 460,142 500,152 C530,159 548,140 560,132 L560,340 L0,340 Z"
        fill="url(#fillGradient)"
      />
      <path
        d="M0,262 C40,242 60,182 100,192 C140,202 150,122 190,112 C230,102 250,182 290,172 C330,162 350,82 390,72 C430,62 460,142 500,152 C530,159 548,140 560,132"
        fill="none"
        stroke={trail}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* waypoints */}
      <circle cx="190" cy="112" r="4.5" fill={pulse} />
      <text x="200" y="100" fontFamily={mono} fontSize="12" fill={mist}>
        +812 m
      </text>

      <circle cx="390" cy="72" r="4.5" fill={pulse} />
      <text x="400" y="60" fontFamily={mono} fontSize="12" fill={mist}>
        182 bpm
      </text>

      <circle cx="560" cy="132" r="4.5" fill={trail} />
      <text x="466" y="122" fontFamily={mono} fontSize="12" fill={mist}>
        21.1 km
      </text>
    </Box>
  );
}

function SectionEyebrow({ children }) {
  return (
    <Typography
      sx={{
        fontFamily: mono,
        fontSize: "0.75rem",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: trail,
        fontWeight: 500,
      }}
    >
      {children}
    </Typography>
  );
}

export default function LandingPage({ hasSession = false }) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: ink, color: paper, fontFamily: body }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "rgba(11, 18, 16, 0.88)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${hairline}`,
          boxShadow: "none",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 } }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexGrow: 1 }}>
              <Box
                sx={{
                  position: "relative",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: pulse,
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    inset: -5,
                    borderRadius: "50%",
                    border: `1px solid ${pulse}`,
                    opacity: 0.5,
                  },
                }}
              />
              <Typography
                sx={{ fontFamily: display, fontWeight: 700, fontSize: "1.35rem", letterSpacing: "0.01em" }}
              >
                Garmin Dashboard
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ display: { xs: "none", md: "flex" } }}
            >
              {["Capacidades", "Tecnología", "Privacidad"].map((label, i) => (
                <Button
                  key={label}
                  href={`#${["capacidades", "tecnologia", "privacidad"][i]}`}
                  sx={{ color: mist, fontFamily: body, textTransform: "none", "&:hover": { color: paper } }}
                >
                  {label}
                </Button>
              ))}
              {hasSession ? (
                <Button
                  component={RouterLink}
                  to="/dashboard"
                  variant="contained"
                  sx={{
                    ml: 1,
                    bgcolor: trail,
                    color: ink,
                    textTransform: "none",
                    fontWeight: 700,
                    "&:hover": { bgcolor: "#f0dcb8" },
                  }}
                >
                  Ir al dashboard
                </Button>
              ) : (
                <Button
                  component="a"
                  href="https://github.com/legongoraek/dashboard-garmin"
                  target="_blank"
                  rel="noreferrer"
                  variant="outlined"
                  sx={{
                    ml: 1,
                    borderColor: hairline,
                    color: paper,
                    textTransform: "none",
                    fontWeight: 600,
                    "&:hover": { borderColor: trail, bgcolor: "rgba(232,205,160,0.06)" },
                  }}
                >
                  Ver código fuente
                </Button>
              )}
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Box component="main">
        <Box component="section" id="inicio" sx={{ py: { xs: 8, md: 12 } }}>
          <Container maxWidth="lg">
            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 6, md: 4 }} alignItems="center">
              <Stack spacing={3} sx={{ flex: 1, textAlign: { xs: "center", md: "left" } }}>
                <Stack direction="row" spacing={1} justifyContent={{ xs: "center", md: "flex-start" }}>
                  <SectionEyebrow>Trail log · proyecto independiente</SectionEyebrow>
                </Stack>

                <Typography
                  component="h1"
                  sx={{
                    fontFamily: display,
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    lineHeight: 0.98,
                    fontSize: { xs: "3rem", sm: "4rem", md: "4.6rem" },
                    maxWidth: 720,
                  }}
                >
                  Tu información de Garmin Connect, en una vista creada para entenderla mejor.
                </Typography>

                <Typography sx={{ color: mist, fontSize: { xs: "1.05rem", md: "1.2rem" }, maxWidth: 560, fontFamily: body }}>
                  Dashboard web independiente para explorar actividad, salud, entrenamiento y rutas
                  desde una interfaz clara y centralizada.
                </Typography>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  justifyContent={{ xs: "center", md: "flex-start" }}
                >
                  {hasSession && (
                    <Button
                      component={RouterLink}
                      to="/dashboard"
                      size="large"
                      sx={{
                        bgcolor: trail,
                        color: ink,
                        textTransform: "none",
                        fontWeight: 700,
                        px: 3,
                        "&:hover": { bgcolor: "#f0dcb8" },
                      }}
                    >
                      Ir al dashboard
                    </Button>
                  )}
                  <Button
                    component="a"
                    href="https://github.com/legongoraek/dashboard-garmin"
                    target="_blank"
                    rel="noreferrer"
                    size="large"
                    endIcon={<OpenInNewRounded />}
                    sx={
                      hasSession
                        ? {
                            borderColor: hairline,
                            color: paper,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 3,
                            border: "1px solid",
                            "&:hover": { borderColor: trail, bgcolor: "rgba(232,205,160,0.06)" },
                          }
                        : {
                            bgcolor: pulse,
                            color: ink,
                            textTransform: "none",
                            fontWeight: 700,
                            px: 3,
                            "&:hover": { bgcolor: "#ff8163" },
                          }
                    }
                  >
                    Ver código fuente
                  </Button>
                </Stack>

                {!hasSession && (
                  <Typography sx={{ color: mist, fontSize: "0.92rem", maxWidth: 480, fontFamily: body }}>
                    Vinculado a una única cuenta de Garmin, la del autor. No es un servicio de
                    registro abierto: no hay login público disponible.
                  </Typography>
                )}
              </Stack>

              <Box sx={{ flex: 1, width: "100%", maxWidth: { xs: 480, md: "none" } }}>
                <ElevationProfile />
              </Box>
            </Stack>
          </Container>
        </Box>

        <Box component="section" id="capacidades" sx={{ py: { xs: 7, md: 10 }, borderTop: `1px solid ${hairline}` }}>
          <Container maxWidth="lg">
            <Stack spacing={5}>
              <Box sx={{ maxWidth: 680 }}>
                <SectionEyebrow>Capacidades reales del proyecto</SectionEyebrow>
                <Typography sx={{ fontFamily: display, fontWeight: 700, fontSize: { xs: "2.1rem", md: "2.6rem" }, mt: 1, mb: 1.5 }}>
                  Datos útiles sin convertir el dashboard en una caja negra.
                </Typography>
                <Typography sx={{ color: mist, fontSize: "1.05rem", fontFamily: body }}>
                  La interfaz reúne información ya disponible en Garmin Connect y la presenta de
                  forma más compacta para consulta personal.
                </Typography>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
                {capabilities.map((item) => (
                  <Box
                    key={item.title}
                    sx={{
                      p: 3,
                      border: `1px solid ${hairline}`,
                      borderRadius: "4px",
                      bgcolor: panel,
                    }}
                  >
                    <Stack spacing={1.5}>
                      {item.icon}
                      <Typography sx={{ fontFamily: mono, fontWeight: 600, letterSpacing: "0.04em" }}>
                        {item.title}
                      </Typography>
                      <Typography sx={{ color: mist, fontFamily: body }}>{item.description}</Typography>
                    </Stack>
                  </Box>
                ))}
              </Box>
            </Stack>
          </Container>
        </Box>

        <Box component="section" id="tecnologia" sx={{ py: { xs: 7, md: 10 }, borderTop: `1px solid ${hairline}` }}>
          <Container maxWidth="lg">
            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 5, md: 9 }}>
              <Box sx={{ flex: 1 }}>
                <SectionEyebrow>Implementación técnica</SectionEyebrow>
                <Typography sx={{ fontFamily: display, fontWeight: 700, fontSize: { xs: "2.1rem", md: "2.6rem" }, mt: 1, mb: 1.5 }}>
                  Una aplicación web completa, no sólo una visualización estática.
                </Typography>
                <Typography sx={{ color: mist, fontSize: "1.05rem", fontFamily: body }}>
                  El frontend consulta un backend dedicado para acceder a Garmin Connect, mantiene
                  una sesión local ligera y soporta el flujo MFA cuando Garmin lo solicita. El mapa
                  de entrenamiento utiliza Leaflet y heatmaps para representar puntos geográficos
                  de actividades.
                </Typography>
              </Box>

              <Stack spacing={3} sx={{ flex: 1 }}>
                <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                  {stack.map((technology) => (
                    <Chip
                      key={technology}
                      label={technology}
                      sx={{
                        fontFamily: mono,
                        fontWeight: 500,
                        fontSize: "0.8rem",
                        color: paper,
                        bgcolor: "transparent",
                        border: `1px solid ${hairline}`,
                        borderRadius: "4px",
                      }}
                    />
                  ))}
                </Stack>

                <Box sx={{ p: 3, border: `1px solid ${hairline}`, borderRadius: "4px", bgcolor: panel }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <SecurityRounded sx={{ color: trail }} />
                      <Typography sx={{ fontFamily: mono, fontWeight: 600 }}>
                        Autenticación y MFA
                      </Typography>
                    </Stack>
                    <Typography sx={{ color: mist, fontFamily: body }}>
                      El login se mantiene separado de la landing pública y conserva el soporte
                      para código MFA cuando Garmin Connect lo requiere.
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Stack>
          </Container>
        </Box>

        <Box component="section" id="privacidad" sx={{ py: { xs: 7, md: 10 }, borderTop: `1px solid ${hairline}` }}>
          <Container maxWidth="md">
            <Box
              sx={{
                p: { xs: 4, md: 5 },
                border: `1px solid ${hairline}`,
                borderRadius: "4px",
                bgcolor: panel,
                boxShadow: `0 0 0 1px rgba(232,205,160,0.03), 0 30px 80px rgba(0,0,0,0.35)`,
              }}
            >
              <Stack spacing={2.5}>
                <LockRounded sx={{ fontSize: 40, color: pulse }} />
                <Typography sx={{ fontFamily: display, fontWeight: 700, fontSize: { xs: "1.9rem", md: "2.3rem" } }}>
                  La landing es pública. Tus datos no.
                </Typography>
                <Typography sx={{ color: paper, fontSize: "1.05rem", fontFamily: body }}>
                  La landing pública no consulta ni muestra información privada de Garmin. Los
                  datos personales sólo se solicitan dentro del área autenticada.
                </Typography>
                <Typography sx={{ color: mist, fontFamily: body }}>
                  Proyecto independiente. Garmin Dashboard no es un producto oficial de Garmin ni
                  está presentado como una aplicación respaldada por Garmin.
                </Typography>
              </Stack>
            </Box>
          </Container>
        </Box>

        <Box component="section" id="acceso" sx={{ py: { xs: 8, md: 11 }, borderTop: `1px solid ${hairline}` }}>
          <Container maxWidth="md">
            <Stack spacing={3} alignItems="center" textAlign="center">
              <Typography sx={{ fontFamily: display, fontWeight: 700, fontSize: { xs: "2.1rem", md: "2.6rem" } }}>
                {hasSession ? "Explora la implementación o entra a tu dashboard." : "Explora la implementación."}
              </Typography>
              <Typography sx={{ color: mist, maxWidth: 640, fontSize: "1.05rem", fontFamily: body }}>
                {hasSession
                  ? "El proyecto está pensado como una implementación técnica visible: puedes revisar el código fuente y, si ya tienes una sesión válida, acceder directamente al dashboard."
                  : "El proyecto está pensado como una implementación técnica visible: puedes revisar el código fuente. El dashboard en sí funciona con una sola cuenta de Garmin, la del autor, así que no hay login público."}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                {hasSession && (
                  <Button
                    component={RouterLink}
                    to="/dashboard"
                    size="large"
                    sx={{ bgcolor: trail, color: ink, textTransform: "none", fontWeight: 700, px: 3, "&:hover": { bgcolor: "#f0dcb8" } }}
                  >
                    Ir al dashboard
                  </Button>
                )}
                <Button
                  component="a"
                  href="https://github.com/legongoraek/dashboard-garmin"
                  target="_blank"
                  rel="noreferrer"
                  size="large"
                  endIcon={<OpenInNewRounded />}
                  sx={
                    hasSession
                      ? {
                          border: "1px solid",
                          borderColor: hairline,
                          color: paper,
                          textTransform: "none",
                          fontWeight: 600,
                          px: 3,
                          "&:hover": { borderColor: trail, bgcolor: "rgba(232,205,160,0.06)" },
                        }
                      : { bgcolor: pulse, color: ink, textTransform: "none", fontWeight: 700, px: 3, "&:hover": { bgcolor: "#ff8163" } }
                  }
                >
                  GitHub
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Box>
      </Box>

      <Box component="footer" sx={{ py: 4, borderTop: `1px solid ${hairline}` }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Typography sx={{ color: mist, fontFamily: mono, fontSize: "0.82rem" }}>
              Garmin Dashboard · Proyecto web independiente
            </Typography>
            <Typography sx={{ color: mist, fontFamily: mono, fontSize: "0.82rem" }}>
              Actividad · Salud · Entrenamiento · Rutas
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
