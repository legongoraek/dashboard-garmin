import { Box, Typography } from "@mui/material";
import TrendLineChart from "./TrendLineChart";

export default function RecoveryTrends({ data = [] }) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
        Recuperación
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        <TrendLineChart
          title="HRV"
          data={data}
          series={[{ key: "hrvMs", label: "HRV", unit: "ms" }]}
        />
        <TrendLineChart
          title="Ritmo cardiaco en reposo"
          data={data}
          series={[{ key: "restingHeartRateBpm", label: "RHR", unit: "bpm" }]}
        />
        <TrendLineChart
          title="Sleep Score"
          data={data}
          series={[{ key: "sleepScore", label: "Sleep Score", unit: "/100" }]}
        />
        <TrendLineChart
          title="Estrés"
          data={data}
          series={[{ key: "stress", label: "Estrés" }]}
        />
        <TrendLineChart
          title="Body Battery"
          data={data}
          series={[{ key: "bodyBattery", label: "Body Battery" }]}
        />
        <TrendLineChart
          title="Readiness"
          data={data}
          series={[{ key: "readinessScore", label: "Readiness" }]}
        />
      </Box>
    </Box>
  );
}
