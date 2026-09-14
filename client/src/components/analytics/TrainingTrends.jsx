import { Box, Typography } from "@mui/material";
import WeeklyVolumeChart from "./WeeklyVolumeChart";

export default function TrainingTrends({ data = [] }) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
        Tendencias de entrenamiento
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        <WeeklyVolumeChart
          title="Distancia semanal"
          data={data}
          dataKey="distanceM"
          label="Distancia"
          unit="km"
          transformValue={(value) => value / 1000}
        />
        <WeeklyVolumeChart
          title="Duración semanal"
          data={data}
          dataKey="durationS"
          label="Duración"
          unit="h"
          transformValue={(value) => value / 3600}
        />
        <WeeklyVolumeChart
          title="Actividades por semana"
          data={data}
          dataKey="activityCount"
          label="Actividades"
        />
        <WeeklyVolumeChart
          title="Desnivel semanal"
          data={data}
          dataKey="elevationGainM"
          label="Desnivel"
          unit="m"
        />
      </Box>
    </Box>
  );
}
