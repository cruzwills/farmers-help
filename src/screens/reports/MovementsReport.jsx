import { useMemo, useState } from "react";
import { Box, Card, MenuItem, TextField, Typography } from "@mui/material";
import NorthRoundedIcon from "@mui/icons-material/NorthRounded";
import SouthRoundedIcon from "@mui/icons-material/SouthRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import { useInventoryState } from "../../context/InventoryContext";
import { CATEGORIES, addDays, today } from "../../utils/inventoryHelpers";
import { exportToCsv } from "../../utils/csv";
import StatCard from "../../components/common/StatCard";
import EmptyState from "../../components/common/EmptyState";
import MovementItem from "../../components/activity/MovementItem";
import ReportGate from "../../components/reports/ReportGate";
import ReportHeader from "../../components/reports/ReportHeader";
import { brand } from "../../theme";

export default function MovementsReport() {
  const { products, movements } = useInventoryState();
  const [from, setFrom] = useState(addDays(new Date(), -30));
  const [to, setTo] = useState(today());
  const [category, setCategory] = useState("All");

  const productCategory = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.id, p.category));
    return map;
  }, [products]);

  const inRange = useMemo(() => {
    const fromTs = new Date(from + "T00:00:00").getTime();
    const toTs = new Date(to + "T23:59:59").getTime();
    return movements.filter((m) => {
      if (m.type !== "IN" && m.type !== "OUT") return false;
      const ts = new Date(m.date).getTime();
      if (ts < fromTs || ts > toTs) return false;
      if (category !== "All" && productCategory.get(m.productId) !== category) return false;
      return true;
    });
  }, [movements, from, to, category, productCategory]);

  const totalIn = inRange.filter((m) => m.type === "IN").reduce((sum, m) => sum + m.qty, 0);
  const totalOut = inRange.filter((m) => m.type === "OUT").reduce((sum, m) => sum + m.qty, 0);

  const byProduct = useMemo(() => {
    const map = new Map();
    inRange.forEach((m) => {
      const row = map.get(m.productId) || { productName: m.productName, unit: m.unit, in: 0, out: 0 };
      if (m.type === "IN") row.in += m.qty;
      else row.out += m.qty;
      map.set(m.productId, row);
    });
    return Array.from(map.values()).sort((a, b) => b.in + b.out - (a.in + a.out));
  }, [inRange]);

  const sortedMovements = [...inRange].sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleExport = () => {
    exportToCsv(
      "stock-movements",
      sortedMovements.map((m) => ({
        Date: new Date(m.date).toISOString(),
        Type: m.type,
        Product: m.productName,
        Batch: m.batchNo,
        Quantity: m.qty,
        Unit: m.unit,
        Note: m.note,
        PerformedBy: m.performedBy || "Unknown user",
      }))
    );
  };

  return (
    <ReportGate>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <ReportHeader
          title="Stock Movements"
          backTo="/reports"
          subtitle="Stock in vs stock out over a date range — deliveries and sales, not corrections."
          onExport={sortedMovements.length ? handleExport : undefined}
        />

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField
            label="From"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="To"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Box>
        <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} fullWidth>
          <MenuItem value="All">All categories</MenuItem>
          {CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
          <StatCard icon={<NorthRoundedIcon />} label="Total stock in" value={totalIn} color={brand.primaryDark} />
          <StatCard icon={<SouthRoundedIcon />} label="Total stock out" value={totalOut} color="#B8790E" />
          <StatCard icon={<SwapVertRoundedIcon />} label="Movements logged" value={inRange.length} color="#5C4B8A" />
        </Box>

        {byProduct.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              By product
            </Typography>
            <Card sx={{ overflow: "hidden" }}>
              {byProduct.map((r, i) => (
                <Box
                  key={r.productName + i}
                  sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderTop: i > 0 ? "1px solid" : "none", borderColor: "divider" }}
                >
                  <Typography sx={{ flex: 1, fontWeight: 700, fontSize: "0.9rem" }} noWrap>
                    {r.productName}
                  </Typography>
                  <Typography sx={{ color: brand.primaryDark, fontWeight: 800, fontSize: "0.85rem" }}>+{r.in}</Typography>
                  <Typography sx={{ color: "#B8790E", fontWeight: 800, fontSize: "0.85rem" }}>-{r.out}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", width: 40, textAlign: "right" }}>
                    {r.unit}
                  </Typography>
                </Box>
              ))}
            </Card>
          </Box>
        )}

        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Movements in range
          </Typography>
          {sortedMovements.length === 0 ? (
            <EmptyState
              icon={<EventBusyRoundedIcon />}
              title="Nothing in this range"
              subtitle="Try widening the date range or clearing the category filter."
            />
          ) : (
            <Card sx={{ px: 1.5 }}>
              {sortedMovements.map((m, i) => (
                <Box key={m.id} sx={{ borderBottom: i < sortedMovements.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
                  <MovementItem movement={m} />
                </Box>
              ))}
            </Card>
          )}
        </Box>
      </Box>
    </ReportGate>
  );
}
