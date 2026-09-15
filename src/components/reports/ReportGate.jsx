import { Box, IconButton, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import { useNavigate } from "react-router-dom";
import { usePermission } from "../../context/InventoryContext";

export default function ReportGate({ children }) {
  const navigate = useNavigate();
  const canView = usePermission("viewReports");

  if (canView) return children;

  return (
    <Box sx={{ textAlign: "center", py: 10, px: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <IconButton onClick={() => navigate(-1)} sx={{ alignSelf: "flex-start", border: "1.5px solid", borderColor: "divider" }} aria-label="back">
        <ArrowBackRoundedIcon />
      </IconButton>
      <LockRoundedIcon sx={{ fontSize: 40, color: "text.secondary", mt: 4 }} />
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        Managers and Admins only
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>
        Ask an Admin to switch your role in Settings if you need access to reports.
      </Typography>
    </Box>
  );
}
