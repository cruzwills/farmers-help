import { Box, Typography } from "@mui/material";

export default function EmptyState({ icon, title, subtitle, tone = "neutral", sx }) {
  const soft = tone === "positive" ? "#E7F0E4" : "#EDEAE0";
  const color = tone === "positive" ? "#14532D" : "#5B5A4A";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 1,
        py: 5,
        px: 2,
        ...sx,
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "16px",
            backgroundColor: soft,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 0.5,
          }}
        >
          {icon}
        </Box>
      )}
      <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 280 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
