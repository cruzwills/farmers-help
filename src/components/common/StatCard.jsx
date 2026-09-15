import { Box, Card, Typography } from "@mui/material";
import { interactiveCardSx } from "../../theme";

export default function StatCard({ icon, label, value, color, soft, onClick }) {
  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        borderColor: soft ? color : undefined,
        backgroundColor: soft || "background.paper",
        minHeight: 108,
        ...(onClick ? interactiveCardSx : { cursor: "default" }),
        "&:active": onClick ? { transform: "scale(0.98)" } : undefined,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: color,
          color: "#fff",
        }}
      >
        {icon}
      </Box>
      <Typography variant="h4" sx={{ lineHeight: 1, fontSize: "1.9rem" }}>
        {value}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700 }}>
        {label}
      </Typography>
    </Card>
  );
}
