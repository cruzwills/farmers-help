import { Badge, Box, List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { useLocation, useNavigate } from "react-router-dom";
import { useInventoryState } from "../../context/InventoryContext";
import { getProductExpiryStatus, getStockLevelStatus } from "../../utils/inventoryHelpers";
import { brand } from "../../theme";

const NAV_ITEMS = [
  { value: "", label: "Dashboard", icon: SpaceDashboardRoundedIcon },
  { value: "inventory", label: "Inventory", icon: Inventory2RoundedIcon },
  { value: "alerts", label: "Alerts", icon: WarningAmberRoundedIcon },
  { value: "activity", label: "Activity", icon: HistoryRoundedIcon },
  { value: "reports", label: "Reports", icon: AssessmentRoundedIcon },
  { value: "settings", label: "Settings", icon: SettingsRoundedIcon },
];

export default function SideNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { products } = useInventoryState();

  const alertCount = products.filter((p) => getStockLevelStatus(p) !== "ok" || getProductExpiryStatus(p) !== "ok").length;
  const current = location.pathname.split("/")[1] || "";

  return (
    <Box
      component="nav"
      sx={{
        display: { xs: "none", md: "block" },
        width: 232,
        flexShrink: 0,
        borderRight: "1.5px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        py: 2,
      }}
    >
      <List sx={{ px: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
        {NAV_ITEMS.map((item) => {
          const selected = current === item.value;
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.value}
              selected={selected}
              onClick={() => navigate(item.value ? `/${item.value}` : "/")}
              sx={{
                borderRadius: "12px",
                py: 1.2,
                transition: "background-color 0.15s ease, transform 0.15s ease",
                "&:hover": { backgroundColor: "#EDEAE0", transform: "translateX(2px)" },
                "&.Mui-selected": { backgroundColor: brand.primary, color: "#fff" },
                "&.Mui-selected:hover": { backgroundColor: brand.primaryDark, transform: "translateX(2px)" },
                "&.Mui-selected .MuiListItemIcon-root": { color: "#fff" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: selected ? "#fff" : "text.secondary" }}>
                {item.value === "alerts" ? (
                  <Badge badgeContent={alertCount} color="error" max={99}>
                    <Icon />
                  </Badge>
                ) : (
                  <Icon />
                )}
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontWeight: 800, fontSize: "0.95rem" }}>{item.label}</ListItemText>
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
