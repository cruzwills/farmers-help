import { Alert, Box, CircularProgress, Snackbar } from "@mui/material";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useInventoryState } from "../../context/InventoryContext";
import { brand } from "../../theme";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import SideNav from "./SideNav";

export default function AppShell() {
  const { status, error, clearError } = useInventoryState();
  const location = useLocation();

  if (status === "loading") {
    return (
      <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: brand.paper }}>
        <CircularProgress sx={{ color: brand.primaryDark }} />
      </Box>
    );
  }

  // no valid signed-in session (never logged in, logged out, or the
  // session/account became invalid) — send to login
  if (status === "signed-out") {
    return <Navigate to="/login" replace />;
  }

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", backgroundColor: "background.default" }}>
      <TopBar />
      <Box sx={{ flex: 1, display: "flex", width: "100%" }}>
        <SideNav />
        <Box
          component="main"
          key={location.pathname}
          className="page-transition"
          sx={{
            flex: 1,
            minWidth: 0,
            maxWidth: { xs: 720, md: 1080 },
            mx: "auto",
            width: "100%",
            px: { xs: 1.5, sm: 3, md: 4 },
            pt: { xs: 2, md: 3 },
            pb: { xs: "calc(84px + env(safe-area-inset-bottom))", md: 5 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
      <BottomNav />
      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={clearError} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={clearError} severity="error" variant="filled" sx={{ fontWeight: 700 }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
