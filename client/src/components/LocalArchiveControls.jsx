import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RestoreIcon from "@mui/icons-material/Restore";
import {
  clearCanonicalActivities,
  listCanonicalActivities,
  saveCanonicalActivity,
} from "../persistence/activityRepository.js";
import {
  buildCanonicalArchiveExport,
  parseCanonicalArchiveExport,
} from "../services/localDataPortability.js";

export default function LocalArchiveControls({ onChanged }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const handleExport = async () => {
    setError("");
    setMessage("");
    try {
      const details = await listCanonicalActivities();
      const payload = buildCanonicalArchiveExport(details);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `dashboard-garmin-canonical-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage(`${details.length} actividades exportadas localmente.`);
    } catch (exportError) {
      setError(exportError?.message || "No se pudo exportar el archivo canónico");
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setMessage("");

    try {
      const details = parseCanonicalArchiveExport(await file.text());
      for (const detail of details) {
        await saveCanonicalActivity(detail);
      }
      setMessage(`${details.length} actividades restauradas en IndexedDB.`);
      await onChanged?.();
    } catch (restoreError) {
      setError(restoreError?.message || "No se pudo restaurar el backup canónico");
    }
  };

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setMessage("Confirma de nuevo para borrar todo el archivo canónico local.");
      return;
    }

    setError("");
    try {
      await clearCanonicalActivities();
      setConfirmClear(false);
      setMessage("Archivo canónico local eliminado del navegador.");
      await onChanged?.();
    } catch (clearError) {
      setError(clearError?.message || "No se pudo borrar el archivo canónico local");
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={800}>
            Privacidad y portabilidad local
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Exporta, restaura o elimina el archivo canónico de IndexedDB. Estas operaciones se realizan en el navegador y no suben el backup a un servidor.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity={confirmClear ? "warning" : "info"}>{message}</Alert>}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
              Exportar JSON
            </Button>
            <Button component="label" variant="outlined" startIcon={<RestoreIcon />}>
              Restaurar backup
              <input hidden type="file" accept="application/json,.json" onChange={handleRestore} />
            </Button>
            <Button
              variant={confirmClear ? "contained" : "outlined"}
              color="error"
              startIcon={<DeleteForeverIcon />}
              onClick={handleClear}
            >
              {confirmClear ? "Confirmar borrado" : "Borrar archivo local"}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
