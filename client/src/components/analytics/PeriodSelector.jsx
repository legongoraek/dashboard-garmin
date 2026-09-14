import { ToggleButton, ToggleButtonGroup } from "@mui/material";

const OPTIONS = [
  ["7d", "7 días"],
  ["4w", "4 semanas"],
  ["12w", "12 semanas"],
  ["6m", "6 meses"],
  ["1y", "1 año"],
];

export default function PeriodSelector({ value, onChange, disabled = false }) {
  const handleChange = (_event, nextValue) => {
    if (nextValue) onChange(nextValue);
  };

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={handleChange}
      disabled={disabled}
      size="small"
      aria-label="Periodo de analítica"
      sx={{ flexWrap: "wrap" }}
    >
      {OPTIONS.map(([key, label]) => (
        <ToggleButton key={key} value={key} aria-label={label}>
          {label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
