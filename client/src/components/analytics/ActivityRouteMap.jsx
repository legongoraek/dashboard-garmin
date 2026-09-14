import { Box, Typography } from "@mui/material";
import { MapContainer, Polyline, TileLayer } from "react-leaflet";

export default function ActivityRouteMap({ trackPoints = [] }) {
  const positions = trackPoints
    .filter((point) => Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude))
    .map((point) => [point.latitude, point.longitude]);

  if (!positions.length) {
    return <Typography color="text.secondary">Esta actividad no tiene ruta GPS disponible.</Typography>;
  }

  return (
    <Box sx={{ height: 360, borderRadius: 2, overflow: "hidden" }}>
      <MapContainer
        bounds={positions}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={positions} />
      </MapContainer>
    </Box>
  );
}
