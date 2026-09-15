import { Box, Typography } from "@mui/material";

export default function StatusPill({ label, color, soft, icon }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.2,
        py: 0.4,
        borderRadius: "8px",
        backgroundColor: soft,
        border: `1.5px solid ${color}55`,
      }}
    >
      {icon}
      <Typography variant="caption" sx={{ fontWeight: 800, color, lineHeight: 1 }}>
        {label}
      </Typography>
    </Box>
  );
}
