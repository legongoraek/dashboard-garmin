import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import TrendLineChart from "./TrendLineChart.jsx";
import { loadLocalMultisourceInsights } from "../../services/localMultisourceInsights.js";

function sourceLabel(source) {
  const labels = {
    garmin: "Garmin",
    garmin_official: "Garmin Official",
    strava: "Strava",
    fit: "FIT",
    gpx: "GPX",
    komoot: "Komoot",
  };
  return labels[source] ?? source;
}

function pct(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "N/A";
  const number = Number(value);
  return `${number >= 0 ? "+" : ""}${number.toFixed(1)}%`;
}

function km(value) {
  return value == null ? "N/A" : `${(Number(value) / 1000).toFixed(1)} km`;
}

function hours(value) {
  return value == null ? "N/A" : `${(Number(value) / 3600).toFixed(1)} h`;
}

export default function LocalMultisourceInsights({ refreshToken = "", endDate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => loadLocalMultisourceInsights({ endDate }))
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError("");
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError?.message || "No se pudo cargar la analítica multisource local");
      });

    return () => {
      cancelled = true;
    };
  }, [refreshToken, endDate]);

  const yoyChart = useMemo(
    () =>
      (data?.yoy ?? []).map((row) => ({
        week: `S${row.week}`,
        currentKm: row.current.distanceM == null ? null : row.current.distanceM / 1000,
        previousKm: row.previous.distanceM == null ? null : row.previous.distanceM / 1000,
      })),
    [data]
  );

  const summary = data?.yoySummary;

  return (
    <Card>
      <CardContent>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Analítica multisource local
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deduplicación y comparación YoY calculadas desde IndexedDB, sin llamadas adicionales a providers.
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {data && (
            <>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip label={`${data.persistedCount} registros fuente`} />
                <Chip label={`${data.logicalCount} actividades lógicas`} color="primary" variant="outlined" />
                <Chip label={`${data.duplicateSourceRecords} duplicados vinculados`} variant="outlined" />
              </Stack>

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {Object.entries(data.sourceCounts).map(([source, count]) => (
                  <Chip key={source} size="small" label={`${sourceLabel(source)}: ${count}`} />
                ))}
              </Stack>

              {!data.persistedCount && (
                <Alert severity="info">
                  Todavía no hay historial canónico local. Al cargar tendencias Garmin o sincronizar/importar fuentes, se irá construyendo automáticamente.
                </Alert>
              )}

              {summary && data.persistedCount > 0 && (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Actividades YTD</Typography>
                    <Typography variant="h6" fontWeight={800}>{summary.current.activityCount}</Typography>
                    <Typography variant="caption">vs {summary.previous.activityCount} · {pct(summary.change.activityCountPct)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Distancia YTD</Typography>
                    <Typography variant="h6" fontWeight={800}>{km(summary.current.distanceM)}</Typography>
                    <Typography variant="caption">vs {km(summary.previous.distanceM)} · {pct(summary.change.distancePct)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Duración YTD</Typography>
                    <Typography variant="h6" fontWeight={800}>{hours(summary.current.durationS)}</Typography>
                    <Typography variant="caption">vs {hours(summary.previous.durationS)} · {pct(summary.change.durationPct)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Desnivel YTD</Typography>
                    <Typography variant="h6" fontWeight={800}>{summary.current.elevationGainM == null ? "N/A" : `${Math.round(summary.current.elevationGainM)} m`}</Typography>
                    <Typography variant="caption">{pct(summary.change.elevationGainPct)}</Typography>
                  </Box>
                </Box>
              )}

              {data.persistedCount > 0 && (
                <TrendLineChart
                  title="Distancia semanal — año actual vs anterior"
                  data={yoyChart}
                  xKey="week"
                  series={[
                    { key: "currentKm", label: "Año actual", unit: "km" },
                    { key: "previousKm", label: "Año anterior", unit: "km" },
                  ]}
                />
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
