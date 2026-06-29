import { useEffect, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  Toolbar,
  Typography,
  Alert,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import MetricSlider from "../components/MetricSlider";

import {
  getActivities,
  getDaily,
  getSleep,
  getWeekly,
  getHrv,
  getReadiness,
} from "../services/garminApi";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function getSevenDaysAgo() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  return Number(value).toLocaleString("es-MX");
}

function formatDistanceMeters(value) {
  if (!value) {
    return "N/A";
  }

  const kilometers = Number(value) / 1000;

  return `${kilometers.toFixed(2)} km`;
}

function formatSecondsToHoursMinutes(seconds) {
  if (seconds === null || seconds === undefined || seconds === "") {
    return "N/A";
  }

  const totalSeconds = Number(seconds);

  if (Number.isNaN(totalSeconds)) {
    return "N/A";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
}

function formatMinutes(value) {
  if (value === null || value === undefined) return "N/A";

  return `${value} min`;
}

function getWeeklyDays(weekly) {
  return Array.isArray(weekly?.days) ? weekly.days : [];
}

function sumWeeklyValue(days, path) {
  return days.reduce((total, item) => {
    const value = path(item);

    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return total;
    }

    return total + Number(value);
  }, 0);
}

function avgWeeklyValue(days, path) {
  const validValues = days
    .map(path)
    .filter((value) => value !== null && value !== undefined && !Number.isNaN(Number(value)));

  if (validValues.length === 0) {
    return null;
  }

  const total = validValues.reduce((sum, value) => sum + Number(value), 0);

  return total / validValues.length;
}

function formatAvg(value, decimals = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  return Number(value).toFixed(decimals);
}

function formatSleepScore(value) {
  if (value === null || value === undefined) {
    return "N/A";
  }

  return `${value}/100`;
}

export default function DashboardPage({ onLogout }) {
  const [daily, setDaily] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState("");

  const [sleep, setSleep] = useState(null);
  const [sleepLoading, setSleepLoading] = useState(false);
  const [sleepError, setSleepError] = useState("");

  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState("");

  const [hrv, setHrv] = useState(null);
  const [hrvLoading, setHrvLoading] = useState(false);
  const [hrvError, setHrvError] = useState("");

  const [readiness, setReadiness] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState("");

  const [weekly, setWeekly] = useState(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState("");

  const today = getToday();
  const sleepDate = getYesterday();

  const loadDailySummary = async () => {
    try {
      setDailyLoading(true);
      setDailyError("");

      const response = await getDaily(today);

      // console.log("Daily response:", response);

      setDaily(response.data);
    } catch (error) {
      console.error("Daily error:", error);

      setDailyError(
        error.response?.data?.error ||
          "No se pudo cargar Daily Summary"
      );
    } finally {
      setDailyLoading(false);
    }
  };

  const loadSleepSummary = async () => {
    try {
      setSleepLoading(true);
      setSleepError("");

      const response = await getSleep(sleepDate);

      // console.log("Sleep response:", response);

      const sleepData = response?.data ?? null;

      setSleep(sleepData);
    } catch (error) {
      console.error("Sleep error:", error);

      setSleepError(
        error.response?.data?.error || "No se pudo cargar Sleep Summary"
      );
    } finally {
      setSleepLoading(false);
    }
  };

  const loadHrvSummary = async () => {
    try {
      setHrvLoading(true);
      setHrvError("");

      const response = await getHrv(today);

      // console.log("HRV response:", response);

      setHrv(response.data);
    } catch (error) {
      console.error("HRV error:", error);

      setHrvError(error.response?.data?.error || "No se pudo cargar HRV");
    } finally {
      setHrvLoading(false);
    }
  };

  const loadReadinessSummary = async () => {
    try {
      setReadinessLoading(true);
      setReadinessError("");

      const response = await getReadiness(today);

      // console.log("Readiness response:", response);

      setReadiness(response.data);
    } catch (error) {
      console.error("Readiness error:", error);

      setReadinessError(
        error.response?.data?.error || "No se pudo cargar Readiness"
      );
    } finally {
      setReadinessLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      setActivitiesLoading(true);
      setActivitiesError("");

      const from = getSevenDaysAgo();

      const response = await getActivities({
        from,
        to: today,
        limit: 5,
      });

      // console.log("Activities response:", response);

      const data = response.data;

      setActivities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Activities error:", error);

      setActivitiesError(
        error.response?.data?.error || "No se pudieron cargar las actividades"
      );
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadWeeklySummary = async () => {
    try {
      setWeeklyLoading(true);
      setWeeklyError("");

      const response = await getWeekly(today);

      // console.log("Weekly response:", response);

      setWeekly(response.data);
    } catch (error) {
      console.error("Weekly error:", error);

      setWeeklyError(
        error.response?.data?.error || "No se pudo cargar Weekly Summary"
      );
    } finally {
      setWeeklyLoading(false);
    }
  };

  const hrvValue =
    hrv?.lastNightAvg ||
    hrv?.weeklyAvg ||
    hrv?.hrvSummary?.lastNightAvg ||
    hrv?.hrvSummary?.weeklyAvg;

  const hrvStatus =
    hrv?.status ||
    hrv?.hrvStatus ||
    hrv?.hrvSummary?.status ||
    "N/A";

  const readinessValue =
    readiness?.score ||
    readiness?.readinessScore ||
    readiness?.trainingReadinessScore ||
    readiness?.dailyTrainingReadinessDTO?.score;

  const readinessLevel =
    readiness?.level ||
    readiness?.readinessLevel ||
    readiness?.dailyTrainingReadinessDTO?.feedbackLong ||
    readiness?.dailyTrainingReadinessDTO?.feedbackShort ||
    "N/A";

  useEffect(() => {
    loadDailySummary();
    loadSleepSummary();
    loadHrvSummary();
    loadReadinessSummary();
    loadActivities();
    loadWeeklySummary();
  }, []);

  const totalSteps = daily?.totalSteps;
  const totalCalories = daily?.totalKilocalories;
  const activeCalories = daily?.activeKilocalories;
  const totalDistance = daily?.totalDistanceMeters;

  const restingHeartRate = daily?.restingHeartRate;
  const maxHeartRate = daily?.maxHeartRate;
  const averageStress = daily?.averageStressLevel;

  const bodyBattery = daily?.bodyBatteryMostRecentValue;
  const bodyBatteryHigh = daily?.bodyBatteryHighestValue;
  const bodyBatteryLow = daily?.bodyBatteryLowestValue;

  const moderateMinutes = daily?.moderateIntensityMinutes;
  const vigorousMinutes = daily?.vigorousIntensityMinutes;
  const intensityGoal = daily?.intensityMinutesGoal;

  const sleepDTO = sleep?.dailySleepDTO;

  const sleepTotalSeconds = sleepDTO?.sleepTimeSeconds;
  const napTimeSeconds = sleepDTO?.napTimeSeconds;
  const deepSleepSeconds = sleepDTO?.deepSleepSeconds;
  const lightSleepSeconds = sleepDTO?.lightSleepSeconds;
  const remSleepSeconds = sleepDTO?.remSleepSeconds;
  const awakeSeconds = sleepDTO?.awakeSleepSeconds;

  const sleepStartLocal = sleepDTO?.sleepStartTimestampLocal;
  const sleepEndLocal = sleepDTO?.sleepEndTimestampLocal;

  const weeklyDays = getWeeklyDays(weekly);

  const weeklyTotalSteps = sumWeeklyValue(
    weeklyDays,
    (item) => item.daily?.totalSteps
  );

  const weeklyTotalCalories = sumWeeklyValue(
    weeklyDays,
    (item) => item.daily?.totalKilocalories
  );

  const weeklyTotalDistance = sumWeeklyValue(
    weeklyDays,
    (item) => item.daily?.totalDistanceMeters
  );

  const weeklyAvgStress = avgWeeklyValue(
    weeklyDays,
    (item) => item.daily?.averageStressLevel
  );

  const weeklyAvgRestingHr = avgWeeklyValue(
    weeklyDays,
    (item) => item.daily?.restingHeartRate
  );

  const weeklyAvgBodyBattery = avgWeeklyValue(
    weeklyDays,
    (item) => item.daily?.bodyBatteryMostRecentValue
  );

  const weeklyTotalSleepSeconds = sumWeeklyValue(
    weeklyDays,
    (item) => item.sleep?.dailySleepDTO?.sleepTimeSeconds
  );

  const weeklyAvgSleepScore = avgWeeklyValue(
    weeklyDays,
    (item) => item.sleep?.dailySleepDTO?.sleepScores?.overall?.value
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1 }}>
            Garmin Dashboard
          </Typography>

          <Button color="inherit" onClick={onLogout}>
            Cerrar sesión
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Resumen de hoy
            </Typography>

            <Typography color="text.secondary">
              Información consultada desde Garmin Connect.
            </Typography>
          </Box>

          <Card>
            {dailyError && (
              <Alert severity="error">
                {dailyError}
              </Alert>
            )}

            <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
              Resumen diario
            </Typography>

            <MetricSlider
              items={[
                {
                  label: "Pasos",
                  value: formatNumber(totalSteps),
                  sublabel: `Meta: ${formatNumber(daily?.dailyStepGoal)}`,
                  loading: dailyLoading,
                },
                {
                  label: "Calorías",
                  value: formatNumber(totalCalories),
                  sublabel: `Activas: ${formatNumber(activeCalories)}`,
                  loading: dailyLoading,
                },
                {
                  label: "Distancia",
                  value: formatDistanceMeters(totalDistance),
                  sublabel: `Wellness: ${formatDistanceMeters(daily?.wellnessDistanceMeters)}`,
                  loading: dailyLoading,
                },
                {
                  label: "Ritmo en reposo",
                  value: restingHeartRate ? `${restingHeartRate} bpm` : "N/A",
                  sublabel: `Máximo: ${maxHeartRate ? `${maxHeartRate} bpm` : "N/A"}`,
                  loading: dailyLoading,
                },
                {
                  label: "Estrés promedio",
                  value: averageStress ?? "N/A",
                  sublabel: `Nivel: ${daily?.stressQualifier ?? "N/A"}`,
                  loading: dailyLoading,
                },
                {
                  label: "Body Battery",
                  value: bodyBattery ?? "N/A",
                  sublabel: `Alto: ${bodyBatteryHigh ?? "N/A"} · Bajo: ${bodyBatteryLow ?? "N/A"}`,
                  loading: dailyLoading,
                },
                {
                  label: "Minutos moderados",
                  value: formatMinutes(moderateMinutes),
                  sublabel: `Meta semanal: ${formatMinutes(intensityGoal)}`,
                  loading: dailyLoading,
                },
                {
                  label: "Minutos intensos",
                  value: formatMinutes(vigorousMinutes),
                  sublabel: "Actividad registrada",
                  loading: dailyLoading,
                },
              ]}
              type="daily"
            />
          
            {sleepError && <Alert severity="error">{sleepError}</Alert>}
            {!sleepLoading && sleepDTO && sleepDTO.sleepTimeSeconds === null && (
              <Alert severity="info">
                Garmin no tiene datos de sueño registrados para esta fecha. Intenta
                consultar el día anterior o revisa si el dispositivo registró sueño.
              </Alert>
            )}
          
            <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
              Sueño
            </Typography>
            <MetricSlider
              items={[
                {
                  label: "Sueño total",
                  value: formatSecondsToHoursMinutes(sleepTotalSeconds),
                  sublabel: `Fecha: ${sleepDTO?.calendarDate ?? sleepDate}`,
                  loading: sleepLoading,
                },
                {
                  label: "Sueño profundo",
                  value: formatSecondsToHoursMinutes(deepSleepSeconds),
                  sublabel: `Ligero: ${formatSecondsToHoursMinutes(lightSleepSeconds)}`,
                  loading: sleepLoading,
                },
                {
                  label: "REM",
                  value: formatSecondsToHoursMinutes(remSleepSeconds),
                  sublabel: `Despierto: ${formatSecondsToHoursMinutes(awakeSeconds)}`,
                  loading: sleepLoading,
                },
                {
                  label: "Siesta",
                  value: formatSecondsToHoursMinutes(napTimeSeconds),
                  sublabel:
                    sleepStartLocal && sleepEndLocal
                      ? `${sleepStartLocal} - ${sleepEndLocal}`
                      : "Sin ventana de sueño",
                  loading: sleepLoading,
                },
              ]}
              type="sleep"
            />
          
            {hrvError && <Alert severity="error">{hrvError}</Alert>}
            {readinessError && <Alert severity="error">{readinessError}</Alert>}
          
            <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
              HRV y Readiness
            </Typography>
            <MetricSlider
              items={[
                {
                  label: "HRV",
                  value: hrvValue ? `${hrvValue} ms` : "N/A",
                  sublabel: `Estado: ${hrvStatus}`,
                  loading: hrvLoading,
                },
                {
                  label: "Readiness",
                  value: readinessValue ?? "N/A",
                  sublabel: readinessLevel,
                  loading: readinessLoading,
                },
              ]}
              type="hrv-readiness"
            />
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Actividades recientes
              </Typography>

              {activitiesLoading && (
                <Typography color="text.secondary">Cargando actividades...</Typography>
              )}

              {activitiesError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {activitiesError}
                </Alert>
              )}

              {!activitiesLoading && activities?.length === 0 && (
                <Typography color="text.secondary">
                  No hay actividades recientes.
                </Typography>
              )}

              <Stack spacing={2}>
                {activities?.map((activity, index) => (
                  <Box
                    key={activity.activityId || index}
                    sx={{
                      p: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                    }}
                  >
                    <Typography fontWeight={800}>
                      {activity.activityName ||
                        activity.activityType?.typeKey ||
                        "Actividad"}
                    </Typography>

                    <Typography color="text.secondary" fontSize={14}>
                      {activity.startTimeLocal ||
                        activity.startTimeGMT ||
                        "Sin fecha"}
                    </Typography>

                    <Typography sx={{ mt: 1 }}>
                      Distancia:{" "}
                      {activity.distance
                        ? formatDistanceMeters(activity.distance)
                        : "N/A"}
                    </Typography>

                    <Typography>
                      Duración:{" "}
                      {activity.duration
                        ? formatSecondsToHoursMinutes(activity.duration)
                        : "N/A"}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Resumen semanal
              </Typography>

              {weeklyLoading && (
                <Typography color="text.secondary">
                  Cargando resumen semanal...
                </Typography>
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
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary">Pasos semanales</Typography>
                        <Typography variant="h5" fontWeight={800}>
                          {formatNumber(weeklyTotalSteps)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {weekly?.from} - {weekly?.to}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary">Calorías semanales</Typography>
                        <Typography variant="h5" fontWeight={800}>
                          {formatNumber(weeklyTotalCalories)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total acumulado
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary">Distancia semanal</Typography>
                        <Typography variant="h5" fontWeight={800}>
                          {formatDistanceMeters(weeklyTotalDistance)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total acumulado
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary">Sueño semanal</Typography>
                        <Typography variant="h5" fontWeight={800}>
                          {formatSecondsToHoursMinutes(weeklyTotalSleepSeconds)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Score prom: {formatSleepScore(formatAvg(weeklyAvgSleepScore))}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary">Estrés promedio</Typography>
                        <Typography variant="h5" fontWeight={800}>
                          {formatAvg(weeklyAvgStress)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Promedio semanal
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary">Ritmo reposo prom.</Typography>
                        <Typography variant="h5" fontWeight={800}>
                          {weeklyAvgRestingHr ? `${formatAvg(weeklyAvgRestingHr)} bpm` : "N/A"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Promedio semanal
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary">Body Battery prom.</Typography>
                        <Typography variant="h5" fontWeight={800}>
                          {formatAvg(weeklyAvgBodyBattery)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Valor reciente promedio
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {weeklyDays?.length > 0 && (
                <Box sx={{ mt: 3, overflowX: "auto" }}>
                  <Box
                    component="table"
                    sx={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: 760,
                    }}
                  >
                    <Box component="thead">
                      <Box component="tr">
                        {[
                          "Fecha",
                          "Pasos",
                          "Calorías",
                          "Distancia",
                          "Sueño",
                          "Sleep Score",
                          "Estrés",
                          "RHR",
                          "Body Battery",
                        ].map((header) => (
                          <Box
                            component="th"
                            key={header}
                            sx={{
                              textAlign: "left",
                              p: 1.5,
                              borderBottom: "1px solid",
                              borderColor: "divider",
                              color: "text.secondary",
                              fontWeight: 700,
                            }}
                          >
                            {header}
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    <Box component="tbody">
                      {weeklyDays?.map((item) => {
                        const dailyItem = item.daily;
                        const sleepItem = item.sleep?.dailySleepDTO;

                        return (
                          <Box component="tr" key={item.date}>
                            <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                              {item.date}
                            </Box>

                            <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                              {formatNumber(dailyItem?.totalSteps)}
                            </Box>

                            <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                              {formatNumber(dailyItem?.totalKilocalories)}
                            </Box>

                            <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                              {formatDistanceMeters(dailyItem?.totalDistanceMeters)}
                            </Box>

                            <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                              {formatSecondsToHoursMinutes(sleepItem?.sleepTimeSeconds)}
                            </Box>

                            <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                              {formatSleepScore(sleepItem?.sleepScores?.overall?.value)}
                            </Box>

                            <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                              {dailyItem?.averageStressLevel ?? "N/A"}
                            </Box>

                            <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                              {dailyItem?.restingHeartRate ? `${dailyItem.restingHeartRate} bpm` : "N/A"}
                            </Box>

                            <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                              {dailyItem?.bodyBatteryMostRecentValue ?? "N/A"}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}