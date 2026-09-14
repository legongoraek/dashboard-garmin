import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useNavigate } from "react-router-dom";
import { parseGpxToCanonical } from "../providers/gpxProvider.js";
import { parseFitToCanonical } from "../providers/fitProvider.js";
import {
  deleteCanonicalActivity,
  listCanonicalActivities,
  saveCanonicalActivity,
} from "../persistence/activityRepository.js";
import {
  disconnectStrava,
  getProviderReadiness,
  startStravaAuthorization,
} from "../services/providerApi.js";
import { syncStravaRecentActivities } from "../services/stravaSync.js";

function statusChip(configured, authorized) {
  if (authorized) return <Chip size="small" color="success" label="Conectado" />;
  return <Chip size="small" color={configured ? "info" : "default"} label={configured ? "Configurado" : "Pendiente"} />;
}

export default function DataSourcesPage() {
  const navigate = useNavigate();
  const [readiness, setReadiness] = useState(null);
  const [imports, setImports] = useState([]);
  const [source, setSource] = useState("gpx");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);

  const refresh = async () => {
    const [providerData, imported] = await Promise.all([
      getProviderReadiness().catch(() => null),
      listCanonicalActivities().catch(() => []),
    ]);
    setReadiness(providerData);
    setImports(imported);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleConnectStrava = async () => {
    setError("");
    try {
      const result = await startStravaAuthorization();
      window.location.assign(result.authorizationUrl);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "No se pudo iniciar OAuth con Strava");
    }
  };

  const handleDisconnectStrava = async () => {
    await disconnectStrava();
    await refresh();
  };

  const handleSyncStrava = async () => {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const result = await syncStravaRecentActivities({ limit: 20 });
      setMessage(`Strava: ${result.synced} actividades sincronizadas${result.failed ? `, ${result.failed} con streams parciales` : ""}.`);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "No se pudo sincronizar Strava");
    } finally {
      setSyncing(false);
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setMessage("");

    try {
      let detail;
      if (source === "fit") {
        detail = await parseFitToCanonical(await file.arrayBuffer(), { fileName: file.name });
      } else {
        detail = parseGpxToCanonical(await file.text(), { source, fileName: file.name });
      }
      await saveCanonicalActivity(detail);
      setMessage(`${detail.activity.name || file.name} importada como ${detail.activity.source}.`);
      await refresh();
    } catch (err) {
      setError(err?.message || "No se pudo importar el archivo");
    }
  };

  const handleDelete = async (activityUid) => {
    await deleteCanonicalActivity(activityUid);
    await refresh();
  };

  const providers = readiness?.providers ?? {};

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4 }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/dashboard")} sx={{ alignSelf: "flex-start" }}>
            Volver al dashboard
          </Button>

          <Box>
            <Typography variant="h4" fontWeight={800}>Fuentes de datos</Typography>
            <Typography color="text.secondary">
              Conecta providers o importa archivos sin mezclar payloads específicos con el dominio canónico.
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={800}>Providers</Typography>

                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box>
                    <Typography fontWeight={700}>Garmin Connect</Typography>
                    <Typography variant="body2" color="text.secondary">Integración personal actual.</Typography>
                  </Box>
                  {statusChip(Boolean(providers.garmin?.configured), true)}
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box>
                    <Typography fontWeight={700}>Strava</Typography>
                    <Typography variant="body2" color="text.secondary">OAuth2 + actividades + streams hacia canonical/IndexedDB.</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                    {statusChip(Boolean(providers.strava?.configured), Boolean(providers.strava?.authorized))}
                    {providers.strava?.authorized ? (
                      <>
                        <Button size="small" variant="contained" startIcon={<CloudSyncIcon />} onClick={handleSyncStrava} disabled={syncing}>
                          {syncing ? "Sincronizando..." : "Sincronizar 20"}
                        </Button>
                        <Button size="small" onClick={handleDisconnectStrava}>Desconectar</Button>
                      </>
                    ) : (
                      <Button size="small" variant="contained" startIcon={<CloudSyncIcon />} onClick={handleConnectStrava} disabled={!providers.strava?.configured}>
                        Conectar
                      </Button>
                    )}
                  </Stack>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box>
                    <Typography fontWeight={700}>Garmin Developer Program</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Activity API / Health API. Requiere aprobación y credenciales emitidas por Garmin.
                    </Typography>
                  </Box>
                  {statusChip(Boolean(providers.garmin_official?.configured), false)}
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box>
                    <Typography fontWeight={700}>PostgreSQL + PostGIS</Typography>
                    <Typography variant="body2" color="text.secondary">Persistencia server-side opcional; IndexedDB permanece como default local.</Typography>
                  </Box>
                  {statusChip(Boolean(readiness?.persistence?.postgresPostgisConfigured), false)}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={800}>Importar actividad</Typography>
                <Typography variant="body2" color="text.secondary">
                  GPX y exports GPX de Komoot funcionan sin cuentas adicionales. FIT usa el adapter preparado para el SDK oficial de Garmin.
                </Typography>
                <FormControl size="small" sx={{ maxWidth: 260 }}>
                  <InputLabel id="source-label">Origen</InputLabel>
                  <Select labelId="source-label" value={source} label="Origen" onChange={(event) => setSource(event.target.value)}>
                    <MenuItem value="gpx">GPX</MenuItem>
                    <MenuItem value="komoot">Komoot GPX</MenuItem>
                    <MenuItem value="fit">FIT</MenuItem>
                  </Select>
                </FormControl>
                <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} sx={{ alignSelf: "flex-start" }}>
                  Seleccionar archivo
                  <input hidden type="file" accept={source === "fit" ? ".fit" : ".gpx,application/gpx+xml"} onChange={handleFile} />
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={800}>Actividades canónicas locales</Typography>
                {!imports.length && <Typography color="text.secondary">Todavía no hay actividades importadas o sincronizadas.</Typography>}
                {imports.map((detail) => (
                  <Stack key={detail.activity.activityUid} direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                    <Box>
                      <Typography fontWeight={700}>{detail.activity.name || detail.activity.activityUid}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {detail.activity.source} · {detail.trackPoints?.length ?? 0} puntos · {detail.activity.distanceM == null ? "sin distancia" : `${(detail.activity.distanceM / 1000).toFixed(2)} km`}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => navigate(`/imported/${encodeURIComponent(detail.activity.activityUid)}`)}>Abrir</Button>
                      <Button size="small" color="error" onClick={() => handleDelete(detail.activity.activityUid)}>Eliminar</Button>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
