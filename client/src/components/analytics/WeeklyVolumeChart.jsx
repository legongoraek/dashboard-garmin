import { Box, Card, CardContent, Typography } from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function WeeklyVolumeChart({
  title,
  data = [],
  dataKey,
  label,
  unit = "",
  transformValue = (value) => value,
}) {
  const chartData = data.map((row) => ({
    ...row,
    displayValue:
      row?.[dataKey] === null || row?.[dataKey] === undefined
        ? null
        : transformValue(row[dataKey]),
  }));

  if (!chartData.length) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            No hay datos para este periodo.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Box sx={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekStart" minTickGap={24} />
              <YAxis width={48} />
              <Tooltip
                formatter={(value) => [
                  value === null || value === undefined
                    ? "N/A"
                    : `${Number(value).toLocaleString("es-MX", { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}`,
                  label,
                ]}
              />
              <Bar dataKey="displayValue" name={label} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
