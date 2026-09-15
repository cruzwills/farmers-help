import { useMemo, useState } from "react";
import { Box, Card, Chip, Typography } from "@mui/material";
import HistoryToggleOffRoundedIcon from "@mui/icons-material/HistoryToggleOffRounded";
import { useInventoryState } from "../context/InventoryContext";
import MovementItem from "../components/activity/MovementItem";
import EmptyState from "../components/common/EmptyState";

function groupLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const startOf = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export default function ActivityLog() {
  const { movements } = useInventoryState();
  const [filter, setFilter] = useState("ALL");

  const filtered = useMemo(() => {
    if (filter === "ALL") return movements;
    if (filter === "ADJUSTMENTS") return movements.filter((m) => m.type === "ADJUST" || m.type === "REMOVE");
    return movements.filter((m) => m.type === filter);
  }, [movements, filter]);

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((m) => {
      const label = groupLabel(m.date);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(m);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 900 }}>
        Activity Log
      </Typography>

      <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 0.5, "&::-webkit-scrollbar": { display: "none" } }}>
        {[
          { key: "ALL", label: "All" },
          { key: "IN", label: "Stock In" },
          { key: "OUT", label: "Stock Out" },
          { key: "ADJUSTMENTS", label: "Adjustments" },
        ].map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            onClick={() => setFilter(f.key)}
            sx={{
              fontWeight: 800,
              flexShrink: 0,
              backgroundColor: filter === f.key ? "primary.dark" : "background.paper",
              color: filter === f.key ? "#fff" : "text.primary",
              border: "1.5px solid",
              borderColor: filter === f.key ? "primary.dark" : "divider",
            }}
          />
        ))}
      </Box>

      {groups.length === 0 && (
        <EmptyState
          icon={<HistoryToggleOffRoundedIcon />}
          title="No movements yet"
          subtitle="Stock-ins, stock-outs and corrections will show up here as they happen."
        />
      )}

      {groups.map(([label, items]) => (
        <Box key={label}>
          <Typography variant="body2" sx={{ fontWeight: 800, color: "text.secondary", mb: 1 }}>
            {label.toUpperCase()}
          </Typography>
          <Card sx={{ px: 1.5 }}>
            {items.map((m, i) => (
              <Box key={m.id} sx={{ borderBottom: i < items.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
                <MovementItem movement={m} />
              </Box>
            ))}
          </Card>
        </Box>
      ))}
    </Box>
  );
}
