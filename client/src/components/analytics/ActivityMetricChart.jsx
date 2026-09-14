import { Box, Typography } from "@mui/material";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function ActivityMetricChart({ title, data, unit = "" }) {
  const hasValues = data?.some((point) => point.value !== null && point.value !== undefined);

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
        {title}
      </Typography>
      {!hasValues ? (
        <Typography color="text.secondary" variant="body2">
          Sin datos disponibles.
        </Typography>
      ) : (
        <Box sx={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" tickFormatter={(value) => `${Math.round(value / 60)}m`} />
              <YAxis />
              <Tooltip formatter={(value) => [value == null ? "N/A" : `${Number(value).toFixed(1)}${unit}`, title]} />
              <Line type="monotone" dataKey="value" dot={false} connectNulls={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
}
