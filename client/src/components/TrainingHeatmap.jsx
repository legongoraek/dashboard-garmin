import { useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Alert,
  TextField,
  Button,
} from "@mui/material";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const DEFAULT_CENTER = [19.4326, -99.1332];
const DEFAULT_ZOOM = 5;

function HeatLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return undefined;

    const heat = L.heatLayer(points, { radius: 20, blur: 15 }).addTo(map);
    // ponytail: leaflet.heat's layer has no getBounds() (unlike most Leaflet
    // layers) — bounds come from the raw points instead.
    map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

export default function TrainingHeatmap({
  from,
  to,
  onFromChange,
  onToChange,
  onLoad,
  loading,
  progress,
  error,
  result,
}) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Mapa de entrenamientos
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 2, alignItems: { sm: "center" } }}
        >
          <TextField
            type="date"
            size="small"
            label="Desde"
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="date"
            size="small"
            label="Hasta"
            value={to}
            onChange={(event) => onToChange(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button variant="contained" onClick={onLoad} disabled={loading}>
            {loading ? "Cargando..." : "Cargar"}
          </Button>
        </Stack>

        {loading && progress && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Cargando actividad {progress.current} de {progress.total}...
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && result && result.activitiesCount === 0 && (
          <Typography color="text.secondary">
            No hay actividades en este rango.
          </Typography>
        )}

        {!loading && result && result.activitiesCount > 0 && (
          <>
            {result.truncated && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Mostrando un máximo de {result.activitiesCount} actividades — el
                rango elegido puede tener más.
              </Alert>
            )}
            {result.skippedCount > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {result.skippedCount} actividad(es) no se pudieron cargar.
              </Alert>
            )}

            <Box sx={{ height: 400, borderRadius: 2, overflow: "hidden" }}>
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <HeatLayer points={result.points} />
              </MapContainer>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
