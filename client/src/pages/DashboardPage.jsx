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
} from "@mui/material";

import {
  getActivities,
  getDaily,
  getSleep,
  getWeekly,
} from "../services/garminApi";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getSevenDaysAgo() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

export default function DashboardPage({ onLogout }) {
  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [sleep, setSleep] = useState(null);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState(true);

  const today = getToday();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [dailyRes, weeklyRes, sleepRes, activitiesRes] = await Promise.all([
        getDaily(today),
        getWeekly(today),
        getSleep(today),
        getActivities(getSevenDaysAgo(), today, 5),
      ]);

      setDaily(dailyRes.data);
      setWeekly(weeklyRes.data);
      setSleep(sleepRes.data);
      setActivities(Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
    } finally {
      setLoading(false);
    }
  };

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

          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary">Pasos</Typography>
                  <Typography variant="h4" fontWeight={800}>
                    {loading ? "..." : daily?.totalSteps ?? "N/A"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary">Calorías</Typography>
                  <Typography variant="h4" fontWeight={800}>
                    {loading ? "..." : daily?.totalKilocalories ?? "N/A"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary">Distancia</Typography>
                  <Typography variant="h4" fontWeight={800}>
                    {loading ? "..." : daily?.totalDistanceMeters ?? "N/A"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary">Sueño</Typography>
                  <Typography variant="h4" fontWeight={800}>
                    {loading ? "..." : sleep?.sleepTimeSeconds ?? "N/A"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Actividades recientes
              </Typography>

              {activities.length === 0 ? (
                <Typography color="text.secondary">
                  No hay actividades recientes para mostrar.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {activities.map((activity, index) => (
                    <Box
                      key={activity.activityId || index}
                      sx={{
                        p: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                      }}
                    >
                      <Typography fontWeight={700}>
                        {activity.activityName || "Actividad"}
                      </Typography>

                      <Typography color="text.secondary">
                        {activity.startTimeLocal || activity.startTimeGMT || ""}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={800}>
                Datos semanales
              </Typography>

              <pre style={{ overflowX: "auto" }}>
                {JSON.stringify(weekly, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}