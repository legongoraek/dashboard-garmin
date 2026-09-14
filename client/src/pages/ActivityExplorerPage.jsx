import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate, useParams } from "react-router-dom";
import { getActivityDetail } from "../services/garminApi.js";
import { buildMetricSeries, normalizeGarminActivityDetail } from "../domain/analytics/activityDetail.js";
import ActivityMetricChart from "../components/analytics/ActivityMetricChart.jsx";
import ActivityRouteMap from "../components/analytics/ActivityRouteMap.jsx";

function formatDistance(value) {
  return value == null ? "N/A" : `${(Number(value) / 1000).toFixed(2)} km`;
}

function formatDuration(value) {
  if (value == null) return "N/A";
  const seconds = Number(value);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function ActivityExplorerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getActivityDetail(id)
      .then((response) => {
        if (!cancelled) {
          setDetail(normalizeGarminActivityDetail(id, response));
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "No se pudo cargar la actividad");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const series = useMemo(() => {
    const samples = detail?.samples ?? [];
    return {
      altitude: buildMetricSeries(samples, "altitudeM"),
      heartRate: buildMetricSeries(samples, "heartRateBpm"),
      speed: buildMetricSeries(samples, "speedMps"),
      cadence: buildMetricSeries(samples, "cadenceRpm"),
      power: buildMetricSeries(samples, "powerW"),
    };
  }, [detail]);

  const activity = detail?.activity;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/dashboard")} sx={{ alignSelf: "flex-start" }}>
            Volver al dashboard
          </Button>

          {loading && <Typography color="text.secondary">Cargando actividad...</Typography>}
          {error && <Alert severity="error">{error}</Alert>}

          {!loading && activity && (
            <>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h4" fontWeight={800}>
                        {activity.name || "Actividad"}
                      </Typography>
                      <Typography color="text.secondary">
                        {activity.startedAtLocal || activity.startedAtUtc || "Fecha no disponible"}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      <Chip label={activity.activityTypeNorm} />
                      <Chip label={formatDistance(activity.distanceM)} variant="outlined" />
                      <Chip label={formatDuration(activity.durationS)} variant="outlined" />
                      {activity.avgHeartRateBpm != null && <Chip label={`${activity.avgHeartRateBpm} bpm promedio`} variant="outlined" />}
                      {activity.elevationGainM != null && <Chip label={`+${activity.elevationGainM} m`} variant="outlined" />}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={800} gutterBottom>Ruta</Typography>
                  <ActivityRouteMap trackPoints={detail.trackPoints} />
                </CardContent>
              </Card>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><ActivityMetricChart title="Elevación" data={series.altitude} unit=" m" /></CardContent></Card></Grid>
                <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><ActivityMetricChart title="Frecuencia cardiaca" data={series.heartRate} unit=" bpm" /></CardContent></Card></Grid>
                <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><ActivityMetricChart title="Velocidad" data={series.speed} unit=" m/s" /></CardContent></Card></Grid>
                <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><ActivityMetricChart title="Cadencia" data={series.cadence} unit=" rpm" /></CardContent></Card></Grid>
                <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><ActivityMetricChart title="Potencia" data={series.power} unit=" W" /></CardContent></Card></Grid>
              </Grid>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
