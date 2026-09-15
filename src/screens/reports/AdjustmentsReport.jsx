import { useMemo, useState } from "react";
import { Box, Card, Chip, MenuItem, TextField, Typography } from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FilterAltOffRoundedIcon from "@mui/icons-material/FilterAltOffRounded";
import { useInventoryState } from "../../context/InventoryContext";
import { formatDate } from "../../utils/inventoryHelpers";
import { exportToCsv } from "../../utils/csv";
import StatCard from "../../components/common/StatCard";
import EmptyState from "../../components/common/EmptyState";
import ReportGate from "../../components/reports/ReportGate";
import ReportHeader from "../../components/reports/ReportHeader";
import { brand } from "../../theme";

export default function AdjustmentsReport() {
  const { movements } = useInventoryState();

  const [type, setType] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");

  const adjustments = useMemo(() => movements.filter((m) => m.type === "ADJUST" || m.type === "REMOVE"), [movements]);

  const users = useMemo(() => {
    const set = new Set(adjustments.map((m) => m.performedBy || "Unknown user"));
    return Array.from(set);
  }, [adjustments]);

  const filtered = useMemo(() => {
    return adjustments.filter((m) => {
      if (type !== "ALL" && m.type !== type) return false;
      if (userFilter !== "ALL" && (m.performedBy || "Unknown user") !== userFilter) return false;
      return true;
    });
  }, [adjustments, type, userFilter]);

  const adjustedCount = adjustments.filter((m) => m.type === "ADJUST").length;
  const removedCount = adjustments.filter((m) => m.type === "REMOVE").length;
  const netAdjustedQty = adjustments.filter((m) => m.type === "ADJUST").reduce((sum, m) => sum + m.qty, 0);

  const handleExport = () => {
    exportToCsv(
      "stock-adjustments",
      filtered.map((m) => ({
        Date: new Date(m.date).toISOString(),
        Type: m.type === "ADJUST" ? "Corrected" : "Removed",
        Product: m.productName,
        Batch: m.batchNo,
        QuantityChange: m.qty,
        Unit: m.unit,
        Reason: m.note,
        PerformedBy: m.performedBy || "Unknown user",
      }))
    );
  };

  return (
    <ReportGate>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <ReportHeader
          title="Stock Adjustment Report"
          backTo="/reports"
          subtitle="Every manual correction and batch write-off, with who made it and why — separate from ordinary stock-in / stock-out sales and deliveries."
          onExport={filtered.length ? handleExport : undefined}
        />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
          <StatCard icon={<TuneRoundedIcon />} label="Corrections logged" value={adjustedCount} color="#5C4B8A" />
          <StatCard icon={<DeleteOutlineRoundedIcon />} label="Batches removed" value={removedCount} color={brand.danger} />
          <StatCard
            icon={<TuneRoundedIcon />}
            label="Net qty corrected"
            value={`${netAdjustedQty > 0 ? "+" : ""}${netAdjustedQty}`}
            color={netAdjustedQty < 0 ? brand.danger : brand.primaryDark}
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value)} fullWidth>
            <MenuItem value="ALL">All types</MenuItem>
            <MenuItem value="ADJUST">Corrections</MenuItem>
            <MenuItem value="REMOVE">Removals</MenuItem>
          </TextField>
          <TextField select label="Performed by" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} fullWidth>
            <MenuItem value="ALL">Everyone</MenuItem>
            {users.map((u) => (
              <MenuItem key={u} value={u}>
                {u}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {filtered.length === 0 && (
            <EmptyState icon={<FilterAltOffRoundedIcon />} title="No adjustments match" subtitle="Try a different type or user filter." />
          )}
          {filtered.map((m) => (
            <AdjustmentRow key={m.id} movement={m} />
          ))}
        </Box>
      </Box>
    </ReportGate>
  );
}

function AdjustmentRow({ movement }) {
  const isRemoval = movement.type === "REMOVE";
  const color = isRemoval ? brand.danger : "#5C4B8A";
  const soft = isRemoval ? "#FBE4E4" : "#ECE8F5";
  const dt = new Date(movement.date);
  const timeLabel = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Chip
            size="small"
            icon={isRemoval ? <DeleteOutlineRoundedIcon sx={{ color: `${color} !important`, fontSize: 16 }} /> : <TuneRoundedIcon sx={{ color: `${color} !important`, fontSize: 16 }} />}
            label={isRemoval ? "Removed" : "Corrected"}
            sx={{ backgroundColor: soft, color, fontWeight: 800 }}
          />
          <Typography sx={{ fontWeight: 800 }}>{movement.productName}</Typography>
        </Box>
        <Typography sx={{ fontWeight: 900, color }}>
          {movement.type === "ADJUST" && movement.qty > 0 ? "+" : movement.type === "ADJUST" ? "" : "-"}
          {movement.qty} {movement.unit}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Batch {movement.batchNo} · {formatDate(movement.date.slice(0, 10))} at {timeLabel}
      </Typography>
      {movement.note && <Typography variant="body2">{movement.note}</Typography>}
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
        Performed by {movement.performedBy || "Unknown user"}
      </Typography>
    </Card>
  );
}
