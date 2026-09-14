import { Button } from "@mui/material";
import HubIcon from "@mui/icons-material/Hub";
import { Link } from "react-router-dom";

export default function SourcesShortcut() {
  return (
    <Button
      component={Link}
      to="/sources"
      variant="contained"
      startIcon={<HubIcon />}
      sx={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 1200,
        boxShadow: 4,
      }}
    >
      Fuentes de datos
    </Button>
  );
}
