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

export default function LocalMultisourceInsights() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => loadLocalMultisourceInsights())
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError?.message || "No se pudo cargar la analítica multisource local");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const yoyChart = useMemo(
    () =>
      (data?.yoy ?? []).map((row) => ({
        week: `S${row.week}`,
        currentKm: row.current.distanceM == null ? null : row.current.distanceM / 1000,
        previousKm: row.previous.distanceM == null ? null : row.previous.distanceM / 1000,
      })),
    [data]
  );

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
