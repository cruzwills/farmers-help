import { Box, Button, Typography } from "@mui/material";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { useNavigate, useRouteError } from "react-router-dom";
import { brand } from "../theme";

export default function NotFound() {
  const navigate = useNavigate();
  const error = useRouteError();
  // used both as a catch-all route (no error object) and as an errorElement
  const is404 = !error || error?.status === 404;

  return (
    <Box sx={{ textAlign: "center", py: 10, px: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: "16px",
          backgroundColor: "#FCF0DA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ErrorOutlineRoundedIcon sx={{ fontSize: 32, color: "#B8790E" }} />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 900 }}>
        {is404 ? "Page not found" : "Something went wrong"}
      </Typography>
      <Typography sx={{ color: "text.secondary", maxWidth: 320 }}>
        {is404
          ? "That screen doesn't exist in Farmer's Help. It may have moved, or the link is out of date."
          : "An unexpected error occurred while loading this screen."}
      </Typography>
      <Button variant="contained" size="large" onClick={() => navigate("/")} sx={{ backgroundColor: brand.primary, mt: 1 }}>
        Back to Dashboard
      </Button>
    </Box>
  );
}
