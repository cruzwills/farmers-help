import { Box, Typography } from "@mui/material";
import NorthRoundedIcon from "@mui/icons-material/NorthRounded";
import SouthRoundedIcon from "@mui/icons-material/SouthRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { brand } from "../../theme";

const TYPE_META = {
  IN: { icon: NorthRoundedIcon, color: brand.primaryDark, soft: "#E7F0E4", sign: "+" },
  OUT: { icon: SouthRoundedIcon, color: "#B8790E", soft: "#FCF0DA", sign: "-" },
  ADJUST: { icon: TuneRoundedIcon, color: "#5C4B8A", soft: "#ECE8F5", sign: "±" },
  REMOVE: { icon: DeleteOutlineRoundedIcon, color: brand.danger, soft: "#FBE4E4", sign: "-" },
};

export default function MovementItem({ movement }) {
  const meta = TYPE_META[movement.type] || TYPE_META.IN;
  const Icon = meta.icon;
  const time = new Date(movement.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const qtyLabel =
    movement.type === "ADJUST"
      ? `${movement.qty > 0 ? "+" : ""}${movement.qty} ${movement.unit}`
      : `${meta.sign}${movement.qty} ${movement.unit}`;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.25 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "10px",
          backgroundColor: meta.soft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon sx={{ color: meta.color }} fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }} noWrap>
          {movement.productName}
        </Typography>
        <Typography
          variant="caption"
          component="p"
          sx={{ color: "text.secondary", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          Batch {movement.batchNo} · {movement.performedBy || "Unknown user"}
          {movement.note ? ` · ${movement.note}` : ""}
        </Typography>
      </Box>
      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 900, color: meta.color, fontSize: "0.95rem" }}>{qtyLabel}</Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {time}
        </Typography>
      </Box>
    </Box>
  );
}
