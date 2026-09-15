import { Box, IconButton, InputBase, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

export default function QuantityStepper({ value, onChange, min = 0, max = Infinity, step = 1, unit }) {
  const clamp = (v) => Math.min(max, Math.max(min, v));

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        border: "2px solid",
        borderColor: "divider",
        borderRadius: "14px",
        overflow: "hidden",
        width: "fit-content",
      }}
    >
      <IconButton
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        sx={{ width: 52, height: 52, borderRadius: 0, backgroundColor: "background.default" }}
        aria-label="decrease quantity"
      >
        <RemoveIcon />
      </IconButton>
      <InputBase
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
          onChange(Number.isNaN(n) ? min : clamp(n));
        }}
        inputProps={{
          inputMode: "numeric",
          style: { textAlign: "center", fontWeight: 800, fontSize: "1.15rem", padding: 0 },
        }}
        sx={{ width: 72, height: 52 }}
      />
      {unit && (
        <Typography variant="body2" sx={{ pr: 1, color: "text.secondary", fontWeight: 700 }}>
          {unit}
        </Typography>
      )}
      <IconButton
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        sx={{ width: 52, height: 52, borderRadius: 0, backgroundColor: "background.default" }}
        aria-label="increase quantity"
      >
        <AddIcon />
      </IconButton>
    </Box>
  );
}
