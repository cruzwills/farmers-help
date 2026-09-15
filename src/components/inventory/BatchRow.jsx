import { Box, Divider, Typography } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { EXPIRY_STATUS_META, daysUntil, formatDate, getExpiryStatus } from "../../utils/inventoryHelpers";
import StatusPill from "../common/StatusPill";

export default function BatchRow({ batch, unit, recommended, onEdit, onDelete }) {
  const status = getExpiryStatus(batch.expiryDate);
  const meta = EXPIRY_STATUS_META[status];
  const d = daysUntil(batch.expiryDate);
  const dayLabel = d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`;

  return (
    <Box
      sx={{
        borderRadius: "12px",
        border: "1.5px solid",
        borderColor: status === "ok" ? "divider" : `${meta.color}55`,
        backgroundColor: status === "ok" ? "background.paper" : meta.soft,
        overflow: "hidden",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            <Typography sx={{ fontWeight: 800 }}>{batch.batchNo}</Typography>
            {recommended && <StatusPill label="Use first" color="#1F4D2C" soft="#E7F0E4" />}
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Expiry {formatDate(batch.expiryDate)}
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <StatusPill label={`${meta.label} · ${dayLabel}`} color={meta.color} soft={meta.soft} />
          </Box>
        </Box>
        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography sx={{ fontWeight: 900, fontSize: "1.15rem" }}>{batch.qty}</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
            {unit}
          </Typography>
        </Box>
      </Box>
      {(onEdit || onDelete) && (
        <>
          <Divider sx={{ borderColor: status === "ok" ? "divider" : `${meta.color}33` }} />
          <Box sx={{ display: "flex" }}>
            {onEdit && (
              <Box
                onClick={onEdit}
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.75,
                  py: 1.1,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  "&:active": { backgroundColor: "rgba(0,0,0,0.04)" },
                }}
              >
                <EditRoundedIcon sx={{ fontSize: 18 }} /> Edit
              </Box>
            )}
            {onEdit && onDelete && <Divider orientation="vertical" flexItem sx={{ borderColor: status === "ok" ? "divider" : `${meta.color}33` }} />}
            {onDelete && (
              <Box
                onClick={onDelete}
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.75,
                  py: 1.1,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: "error.main",
                  "&:active": { backgroundColor: "rgba(0,0,0,0.04)" },
                }}
              >
                <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} /> Remove
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
