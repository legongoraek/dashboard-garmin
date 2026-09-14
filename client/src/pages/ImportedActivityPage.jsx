import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate, useParams } from "react-router-dom";
import { getCanonicalActivity } from "../persistence/activityRepository.js";
import { buildMetricSeries } from "../domain/analytics/activityDetail.js";
import ActivityMetricChart from "../components/analytics/ActivityMetricChart.jsx";
import ActivityRouteMap from "../components/analytics/ActivityRouteMap.jsx";

function formatDistance(value) {
  return value == null ? "N/A" : `${(Number(value) / 1000).toFixed(2)} km`;
}

export default function ImportedActivityPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getCanonicalActivity(decodeURIComponent(id))
      .then((value) => {
        if (!value) setError("La actividad local ya no existe.");
        setDetail(value);
      })
      .catch((err) => setError(err?.message || "No se pudo abrir la actividad local"));
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
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/sources")} sx={{ alignSelf: "flex-start" }}>
            Volver a fuentes
          </Button>
          {error && <Alert severity="error">{error}</Alert>}
          {!detail && !error && <Typography color="text.secondary">Cargando actividad...</Typography>}
          {activity && (
            <>
              <Card><CardContent><Stack spacing={2}>
                <Typography variant="h4" fontWeight={800}>{activity.name || activity.activityUid}</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip label={activity.source} color="primary" />
                  <Chip label={activity.activityTypeNorm} />
                  <Chip label={formatDistance(activity.distanceM)} variant="outlined" />
                  {activity.startedAtUtc && <Chip label={activity.startedAtUtc} variant="outlined" />}
                </Stack>
              </Stack></CardContent></Card>

              <Card><CardContent>
                <Typography variant="h6" fontWeight={800} gutterBottom>Ruta</Typography>
                <ActivityRouteMap trackPoints={detail.trackPoints ?? []} />
              </CardContent></Card>

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
