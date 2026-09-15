import { Badge, BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { useLocation, useNavigate } from "react-router-dom";
import { useInventoryState } from "../../context/InventoryContext";
import { getProductExpiryStatus, getStockLevelStatus } from "../../utils/inventoryHelpers";

function topSegment(pathname) {
  const seg = pathname.split("/")[1] || "";
  return seg;
}

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { products } = useInventoryState();

  const alertCount = products.filter((p) => {
    const stock = getStockLevelStatus(p);
    const expiry = getProductExpiryStatus(p);
    return stock !== "ok" || expiry !== "ok";
  }).length;

  const current = topSegment(location.pathname) || "dashboard";

  return (
    <Paper
      elevation={0}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        borderTop: "1.5px solid",
        borderColor: "divider",
        pb: "env(safe-area-inset-bottom)",
        zIndex: 10,
        display: { xs: "block", md: "none" },
      }}
    >
      <BottomNavigation
        value={current}
        onChange={(_, value) => navigate(value === "dashboard" ? "/" : `/${value}`)}
        showLabels
        sx={{ maxWidth: 720, mx: "auto", height: 72 }}
      >
        <BottomNavigationAction label="Home" value="dashboard" icon={<SpaceDashboardRoundedIcon />} />
        <BottomNavigationAction label="Inventory" value="inventory" icon={<Inventory2RoundedIcon />} />
        <BottomNavigationAction
          label="Alerts"
          value="alerts"
          icon={
            <Badge badgeContent={alertCount} color="error" max={99}>
              <WarningAmberRoundedIcon />
            </Badge>
          }
        />
        <BottomNavigationAction label="Activity" value="activity" icon={<HistoryRoundedIcon />} />
        <BottomNavigationAction label="Reports" value="reports" icon={<AssessmentRoundedIcon />} />
        <BottomNavigationAction label="Settings" value="settings" icon={<SettingsRoundedIcon />} />
      </BottomNavigation>
    </Paper>
  );
}
