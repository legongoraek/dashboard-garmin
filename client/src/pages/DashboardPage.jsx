import { useEffect, useRef, useState } from "react";
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
  TextField,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import MetricSlider from "../components/MetricSlider";
import RecentActivities from "../components/RecentActivities";
import WeeklySummary from "../components/WeeklySummary";

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

function getPreviousDate(dateString, days = 1) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function getSevenDaysAgoFrom(dateString) {
  return getPreviousDate(dateString, 6);
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
  const lastLoadedDateRef = useRef(null);

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

  const [selectedDate, setSelectedDate] = useState(() => {
    return localStorage.getItem("garmin_selected_date") || getToday();
  });
  const today = selectedDate;
  const sleepDate = selectedDate;

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

      const from = getSevenDaysAgoFrom(selectedDate);

      const response = await getActivities({
        from,
        to: selectedDate,
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
    if (!selectedDate) return;

    localStorage.setItem("garmin_selected_date", selectedDate);

    if (lastLoadedDateRef.current === selectedDate) {
      return;
    }

    lastLoadedDateRef.current = selectedDate;

    loadDailySummary();
    loadSleepSummary();
    loadHrvSummary();
    loadReadinessSummary();
    loadActivities();
    loadWeeklySummary();
  }, [selectedDate]);

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
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight={800}>
                Resumen Garmin
              </Typography>

              <Typography color="text.secondary">
                Información consultada desde Garmin Connect.
              </Typography>
            </Box>

            <TextField
              type="date"
              size="small"
              label="Fecha"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              sx={{
                width: { xs: "100%", sm: "auto" },
                minWidth: { xs: "100%", sm: 180 },
              }}
            />
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
              storageKey="garmin_daily_metrics"
              filterable
            />
          
            {sleepError && <Alert severity="error">{sleepError}</Alert>}
            {!sleepLoading && sleepDTO && sleepDTO?.sleepTimeSeconds === null && (
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
              storageKey="garmin_sleep_metrics"
              filterable
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

          <RecentActivities
            activities={activities}
            activitiesLoading={activitiesLoading}
            activitiesError={activitiesError}
            formatDistanceMeters={formatDistanceMeters}
            formatSecondsToHoursMinutes={formatSecondsToHoursMinutes}
          />

          <WeeklySummary
            weekly={weekly}
            weeklyDays={weeklyDays}
            weeklyLoading={weeklyLoading}
            weeklyError={weeklyError}
            weeklyTotalSteps={weeklyTotalSteps}
            weeklyTotalCalories={weeklyTotalCalories}
            weeklyTotalDistance={weeklyTotalDistance}
            weeklyTotalSleepSeconds={weeklyTotalSleepSeconds}
            weeklyAvgSleepScore={weeklyAvgSleepScore}
            weeklyAvgStress={weeklyAvgStress}
            weeklyAvgRestingHr={weeklyAvgRestingHr}
            weeklyAvgBodyBattery={weeklyAvgBodyBattery}
            formatNumber={formatNumber}
            formatDistanceMeters={formatDistanceMeters}
            formatSecondsToHoursMinutes={formatSecondsToHoursMinutes}
            formatAvg={formatAvg}
            formatSleepScore={formatSleepScore}
          />
        </Stack>
      </Container>
    </Box>
  );
}