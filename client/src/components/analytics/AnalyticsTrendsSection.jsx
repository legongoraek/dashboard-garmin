import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import LocalMultisourceInsights from "./LocalMultisourceInsights.jsx";
import PeriodSelector from "./PeriodSelector";
import RecoveryTrends from "./RecoveryTrends";
import TrainingTrends from "./TrainingTrends";
import { loadAnalyticsTrends } from "../../services/trendsData.js";

export default function AnalyticsTrendsSection({ endDate }) {
  const [period, setPeriod] = useState("4w");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!endDate) return undefined;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await loadAnalyticsTrends({ endDate, period });
        if (!cancelled) setData(result);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || "No se pudieron cargar las tendencias históricas");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [endDate, period]);

  const hasTrainingData = Boolean(data?.weeklyActivity?.length);
  const hasRecoveryData = Boolean(data?.recovery?.length);
  const hasAnyData = hasTrainingData || hasRecoveryData;

  return (
    <Stack spacing={3}>
      <LocalMultisourceInsights endDate={endDate} />

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 2,
                justifyContent: "space-between",
                alignItems: { xs: "stretch", md: "center" },
              }}
            >
              <Box>
                <Typography variant="h5" fontWeight={800}>
                  Analítica histórica
                </Typography>
                <Typography color="text.secondary">
                  Tendencias normalizadas de entrenamiento y recuperación.
                </Typography>
              </Box>
              <PeriodSelector value={period} onChange={setPeriod} disabled={loading} />
            </Box>

            {loading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <CircularProgress size={20} />
                <Typography color="text.secondary">
                  Actualizando tendencias…
                </Typography>
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            {data?.partialErrors?.length > 0 && (
              <Alert severity="warning">
                Algunas fechas o métricas no estuvieron disponibles. Se muestran los datos que sí pudieron recuperarse.
              </Alert>
            )}

            {!loading && !error && data && !hasAnyData && (
              <Alert severity="info">No hay datos para este periodo.</Alert>
            )}

            {data && (
              <Stack spacing={4}>
                <TrainingTrends data={data.weeklyActivity} />
                <RecoveryTrends data={data.recovery} />
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
