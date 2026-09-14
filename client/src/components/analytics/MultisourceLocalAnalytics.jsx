import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { listCanonicalActivities } from "../../persistence/activityRepository.js";
import { buildLocalAnalytics } from "../../services/localAnalytics.js";

function pct(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "N/A";
  const number = Number(value);
  return `${number >= 0 ? "+" : ""}${number.toFixed(1)}%`;
}

function distance(value) {
  return value == null ? "N/A" : `${(Number(value) / 1000).toFixed(1)} km`;
}

function duration(value) {
  return value == null ? "N/A" : `${(Number(value) / 3600).toFixed(1)} h`;
}

export default function MultisourceLocalAnalytics({ endDate }) {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => listCanonicalActivities())
      .then((details) => buildLocalAnalytics(details, endDate))
      .then((result) => {
        if (!cancelled) setAnalytics(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "No se pudo cargar la analítica multisource local");
      });
    return () => {
      cancelled = true;
    };
  }, [endDate]);

  if (error) return <Alert severity="warning">{error}</Alert>;
  if (!analytics || analytics.sourceRecords === 0) return null;

  const { current, previous, change } = analytics.yearOverYear;

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={800}>Analítica multisource local</Typography>
            <Typography variant="body2" color="text.secondary">
              IndexedDB canónico · deduplicación Garmin/Strava/GPX/FIT/Komoot · YoY sin llamadas históricas adicionales a Garmin.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`${analytics.sourceRecords} registros fuente`} />
            <Chip label={`${analytics.logicalActivities.length} actividades lógicas`} />
            <Chip label={`${analytics.duplicateGroups} grupos duplicados`} variant="outlined" />
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">Actividades YTD</Typography>
              <Typography variant="h6" fontWeight={800}>{current.activityCount}</Typography>
              <Typography variant="caption">vs {previous.activityCount} · {pct(change.activityCountPct)}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Distancia YTD</Typography>
              <Typography variant="h6" fontWeight={800}>{distance(current.distanceM)}</Typography>
              <Typography variant="caption">vs {distance(previous.distanceM)} · {pct(change.distancePct)}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Duración YTD</Typography>
              <Typography variant="h6" fontWeight={800}>{duration(current.durationS)}</Typography>
              <Typography variant="caption">vs {duration(previous.durationS)} · {pct(change.durationPct)}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Desnivel YTD</Typography>
              <Typography variant="h6" fontWeight={800}>{current.elevationGainM == null ? "N/A" : `${Math.round(current.elevationGainM)} m`}</Typography>
              <Typography variant="caption">{pct(change.elevationGainPct)}</Typography>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
