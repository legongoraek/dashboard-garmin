import {
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import MetricSlider from "./MetricSlider";

// Colorea el sleep score visualmente
function SleepScoreChip({ value }) {
  if (!value || value === "N/A") return <Typography fontSize={14}>N/A</Typography>;
  const score = Number(value);
  const color = score >= 80 ? "success" : score >= 60 ? "warning" : "error";
  return <Chip label={`${score}/100`} color={color} size="small" variant="outlined" />;
}

// Colorea el nivel de estrés
function StressCell({ value }) {
  if (value === null || value === undefined) return <Typography fontSize={14}>N/A</Typography>;
  const n = Number(value);
  const color = n <= 25 ? "success" : n <= 50 ? "warning" : "error";
  return <Chip label={value} color={color} size="small" variant="outlined" />;
}

const HEADERS = [
  "Fecha",
  "Pasos",
  "Calorías",
  "Distancia",
  "Sueño",
  "Sleep Score",
  "Estrés",
  "RHR",
  "Body Battery",
];

export default function WeeklySummary({
  weekly,
  weeklyDays,
  weeklyLoading,
  weeklyError,
  weeklyTotalSteps,
  weeklyTotalCalories,
  weeklyTotalDistance,
  weeklyTotalSleepSeconds,
  weeklyAvgSleepScore,
  weeklyAvgStress,
  weeklyAvgRestingHr,
  weeklyAvgBodyBattery,
  formatNumber,
  formatDistanceMeters,
  formatSecondsToHoursMinutes,
  formatAvg,
  formatSleepScore,
}) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Resumen semanal
        </Typography>

        {weeklyLoading && (
          <Typography color="text.secondary">Cargando resumen semanal...</Typography>
        )}

        {weeklyError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {weeklyError}
          </Alert>
        )}

        {!weeklyLoading && weeklyDays?.length === 0 && (
          <Typography color="text.secondary">
            No hay información semanal disponible.
          </Typography>
        )}

        {weeklyDays?.length > 0 && (
          <>
            {/* Rango de fechas */}
            {weekly?.from && weekly?.to && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {weekly.from} — {weekly.to}
              </Typography>
            )}

            {/* Tarjetas de resumen usando el slider ya existente */}
            <MetricSlider
              items={[
                {
                  label: "Pasos semanales",
                  value: formatNumber(weeklyTotalSteps),
                  sublabel: "Total acumulado",
                },
                {
                  label: "Calorías semanales",
                  value: formatNumber(weeklyTotalCalories),
                  sublabel: "Total acumulado",
                },
                {
                  label: "Distancia semanal",
                  value: formatDistanceMeters(weeklyTotalDistance),
                  sublabel: "Total acumulado",
                },
                {
                  label: "Sueño semanal",
                  value: formatSecondsToHoursMinutes(weeklyTotalSleepSeconds),
                  sublabel: `Score prom: ${formatSleepScore(formatAvg(weeklyAvgSleepScore))}`,
                },
                {
                  label: "Estrés promedio",
                  value: formatAvg(weeklyAvgStress),
                  sublabel: "Promedio semanal",
                },
                {
                  label: "Ritmo reposo prom.",
                  value: weeklyAvgRestingHr
                    ? `${formatAvg(weeklyAvgRestingHr)} bpm`
                    : "N/A",
                  sublabel: "Promedio semanal",
                },
                {
                  label: "Body Battery prom.",
                  value: formatAvg(weeklyAvgBodyBattery),
                  sublabel: "Valor reciente promedio",
                },
              ]}
            />

            {/* Tabla diaria */}
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                Detalle por día
              </Typography>

              <TableContainer sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "action.hover" }}>
                      {HEADERS.map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {weeklyDays.map((item) => {
                      const d = item.daily;
                      const s = item.sleep?.dailySleepDTO;

                      return (
                        <TableRow
                          key={item.date}
                          hover
                          sx={{ "&:last-child td": { borderBottom: 0 } }}
                        >
                          <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                            {item.date}
                          </TableCell>
                          <TableCell>{formatNumber(d?.totalSteps)}</TableCell>
                          <TableCell>{formatNumber(d?.totalKilocalories)}</TableCell>
                          <TableCell>{formatDistanceMeters(d?.totalDistanceMeters)}</TableCell>
                          <TableCell>{formatSecondsToHoursMinutes(s?.sleepTimeSeconds)}</TableCell>
                          <TableCell>
                            <SleepScoreChip value={s?.sleepScores?.overall?.value} />
                          </TableCell>
                          <TableCell>
                            <StressCell value={d?.averageStressLevel} />
                          </TableCell>
                          <TableCell>
                            {d?.restingHeartRate ? `${d.restingHeartRate} bpm` : "N/A"}
                          </TableCell>
                          <TableCell>
                            {d?.bodyBatteryMostRecentValue ?? "N/A"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}