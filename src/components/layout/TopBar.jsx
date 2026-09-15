import { useState } from "react";
import { Avatar, Badge, Box, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/NotificationsNoneRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useNavigate } from "react-router-dom";
import { useCurrentUser, useInventoryActions, useInventoryState } from "../../context/InventoryContext";
import { getProductExpiryStatus, getStockLevelStatus } from "../../utils/inventoryHelpers";
import { ROLE_META } from "../../utils/permissions";
import { brand } from "../../theme";

export default function TopBar() {
  const navigate = useNavigate();
  const { products } = useInventoryState();
  const { logout } = useInventoryActions();
  const currentUser = useCurrentUser();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const alertCount = products.filter((p) => {
    const stock = getStockLevelStatus(p);
    const expiry = getProductExpiryStatus(p);
    return stock !== "ok" || expiry === "critical" || expiry === "expired" || expiry === "warning";
  }).length;

  const initials = currentUser?.name
    ? currentUser.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        backgroundColor: brand.primaryDark,
        pt: "env(safe-area-inset-top)",
      }}
    >
      <Box
        sx={{
          maxWidth: { xs: 720, md: 1350 },
          mx: "auto",
          px: 2,
          py: 1.4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: "12px",
              backgroundColor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              p: 0.5,
            }}
          >
            <Box component="img" src="/brand/logo-icon.png" alt="" aria-hidden sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: "#fff", fontWeight: 900, letterSpacing: 0.5, lineHeight: 1, fontSize: "1.15rem" }} noWrap>
              FARMER&apos;S HELP
            </Typography>
            <Typography sx={{ color: brand.accent, fontWeight: 700, fontSize: "0.68rem", letterSpacing: 0.3, fontStyle: "italic" }} noWrap>
              making farming easier!!
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton onClick={() => navigate("/alerts")} sx={{ color: "#fff" }} aria-label="alerts">
            <Badge badgeContent={alertCount} color="secondary" max={99}>
              <NotificationsIcon />
            </Badge>
          </IconButton>
          {currentUser && (
            <>
              <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)} aria-label="account menu" sx={{ p: 0.4 }}>
                <Avatar sx={{ width: 32, height: 32, backgroundColor: brand.accent, color: brand.primaryDark, fontWeight: 900, fontSize: "0.8rem" }}>
                  {initials}
                </Avatar>
              </IconButton>
              <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={() => setUserMenuAnchor(null)}>
                <Box sx={{ px: 2, py: 1, minWidth: 180 }}>
                  <Typography sx={{ fontWeight: 800 }} noWrap>
                    {currentUser.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: ROLE_META[currentUser.role].color, fontWeight: 700 }}>
                    {currentUser.role}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    navigate("/settings");
                  }}
                >
                  <ListItemIcon>
                    <SettingsRoundedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Settings</ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    logout();
                    navigate("/login");
                  }}
                >
                  <ListItemIcon>
                    <LogoutRoundedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Log out</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Box>
      {/* hazard-stripe accent — a nod to crop-protection label styling */}
      <Box
        sx={{
          height: 5,
          backgroundImage: `repeating-linear-gradient(-45deg, ${brand.accent} 0 12px, ${brand.primaryDark} 12px 24px)`,
        }}
      />
    </Box>
  );
}
