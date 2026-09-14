import { Box, Card, CardContent, Typography } from "@mui/material";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatTooltip(value, _name, item) {
  if (value === null || value === undefined) return ["N/A", item?.name];
  const unit = item?.payload?.__units?.[item?.dataKey] || "";
  return [`${Number(value).toLocaleString("es-MX", { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}`, item?.name];
}

export default function TrendLineChart({
  title,
  data = [],
  xKey = "dateLocal",
  series = [],
  height = 280,
}) {
  if (!data.length) {
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

  const chartData = data.map((row) => ({
    ...row,
    __units: Object.fromEntries(series.map((item) => [item.key, item.unit || ""])),
  }));

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Box sx={{ width: "100%", height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} minTickGap={24} />
              <YAxis width={48} />
              <Tooltip formatter={formatTooltip} />
              <Legend />
              {series.map((item) => (
                <Line
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  name={item.label}
                  connectNulls={false}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
