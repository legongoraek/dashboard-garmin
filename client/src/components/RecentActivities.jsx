import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Alert,
  Avatar,
  Chip,
  Divider,
} from "@mui/material";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike";
import PoolIcon from "@mui/icons-material/Pool";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import HikingIcon from "@mui/icons-material/Hiking";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import RouteIcon from "@mui/icons-material/Route";
import TimerIcon from "@mui/icons-material/Timer";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import SpeedIcon from "@mui/icons-material/Speed";

// Mapea el tipo de actividad de Garmin a un ícono + color
const ACTIVITY_ICON_MAP = {
  running: { icon: DirectionsRunIcon, color: "#ef4444" },
  cycling: { icon: DirectionsBikeIcon, color: "#3b82f6" },
  swimming: { icon: PoolIcon, color: "#06b6d4" },
  strength_training: { icon: FitnessCenterIcon, color: "#a855f7" },
  hiking: { icon: HikingIcon, color: "#16a34a" },
  walking: { icon: DirectionsWalkIcon, color: "#f59e0b" },
};

function getActivityVisual(activity) {
  const key = activity.activityType?.typeKey?.toLowerCase() || "";
  const match = Object.keys(ACTIVITY_ICON_MAP).find((k) => key.includes(k));
  return ACTIVITY_ICON_MAP[match] || { icon: SportsScoreIcon, color: "#64748b" };
}

export default function RecentActivities({
  activities,
  activitiesLoading,
  activitiesError,
  formatDistanceMeters,
  formatSecondsToHoursMinutes,
}) {
  return (
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

        <Stack spacing={1.5}>
          {activities?.map((activity, index) => {
            const { icon: Icon, color } = getActivityVisual(activity);
            const calories = activity.calories
              ? `${Math.round(activity.calories)} kcal`
              : null;
            const pace =
              activity.averageSpeed && activity.distance
                ? `${(activity.averageSpeed * 3.6).toFixed(1)} km/h`
                : null;

            return (
              <Box key={activity.activityId || index}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    transition: "background-color 0.15s ease",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: `${color}1A`,
                      color: color,
                      width: 44,
                      height: 44,
                    }}
                  >
                    <Icon />
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 1,
                      }}
                    >
                      <Typography fontWeight={800} noWrap>
                        {activity.activityName ||
                          activity.activityType?.typeKey ||
                          "Actividad"}
                      </Typography>
                      <Typography
                        color="text.secondary"
                        fontSize={13}
                        sx={{ whiteSpace: "nowrap" }}
                      >
                        {activity.startTimeLocal ||
                          activity.startTimeGMT ||
                          "Sin fecha"}
                      </Typography>
                    </Box>

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mt: 1, flexWrap: "wrap", rowGap: 1 }}
                    >
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<RouteIcon sx={{ fontSize: 16 }} />}
                        label={
                          activity.distance
                            ? formatDistanceMeters(activity.distance)
                            : "N/A"
                        }
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<TimerIcon sx={{ fontSize: 16 }} />}
                        label={
                          activity.duration
                            ? formatSecondsToHoursMinutes(activity.duration)
                            : "N/A"
                        }
                      />
                      {calories && (
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<LocalFireDepartmentIcon sx={{ fontSize: 16 }} />}
                          label={calories}
                        />
                      )}
                      {pace && (
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<SpeedIcon sx={{ fontSize: 16 }} />}
                          label={pace}
                        />
                      )}
                    </Stack>
                  </Box>
                </Box>

                {index < activities.length - 1 && <Divider sx={{ mt: 1.5 }} />}
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}