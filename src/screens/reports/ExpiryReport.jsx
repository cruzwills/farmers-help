import { useMemo, useState } from "react";
import { Box, Card, MenuItem, TextField, Typography } from "@mui/material";
import { useInventoryState } from "../../context/InventoryContext";
import {
  CATEGORIES,
  CATEGORY_META,
  EXPIRY_STATUS_META,
  daysUntil,
  formatDate,
  getAllBatchesWithProduct,
  getExpiryStatus,
} from "../../utils/inventoryHelpers";
import { exportToCsv } from "../../utils/csv";
import { CategoryIcon } from "../../utils/categoryIcons";
import StatusPill from "../../components/common/StatusPill";
import ReportGate from "../../components/reports/ReportGate";
import ReportHeader from "../../components/reports/ReportHeader";

const BUCKET_ORDER = ["expired", "critical", "warning", "ok"];
const BUCKET_LABEL = {
  expired: "Expired",
  critical: "Expiring within 30 days",
  warning: "Expiring in 31–90 days",
  ok: "Good — over 90 days",
};

export default function ExpiryReport() {
  const { products } = useInventoryState();
  const [category, setCategory] = useState("All");

  const batches = useMemo(() => {
    const all = getAllBatchesWithProduct(products);
    const filtered = category === "All" ? all : all.filter((b) => b.product.category === category);
    return filtered.sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate));
  }, [products, category]);

  const grouped = useMemo(() => {
    const map = { expired: [], critical: [], warning: [], ok: [] };
    batches.forEach((b) => map[getExpiryStatus(b.expiryDate)].push(b));
    return map;
  }, [batches]);

  const handleExport = () => {
    exportToCsv(
      "expiry-report",
      batches.map((b) => ({
        Product: b.product.name,
        Category: b.product.category,
        Batch: b.batchNo,
        Quantity: b.qty,
        Unit: b.product.unit,
        ExpiryDate: b.expiryDate,
        DaysUntilExpiry: daysUntil(b.expiryDate),
        Status: EXPIRY_STATUS_META[getExpiryStatus(b.expiryDate)].label,
      }))
    );
  };

  return (
    <ReportGate>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <ReportHeader
          title="Expiry Report"
          backTo="/reports"
          subtitle="Every batch in stock, grouped by how much shelf life it has left."
          onExport={batches.length ? handleExport : undefined}
        />

        <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} fullWidth>
          <MenuItem value="All">All categories</MenuItem>
          {CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>

        {BUCKET_ORDER.map((bucket) => {
          const rows = grouped[bucket];
          if (rows.length === 0) return null;
          const meta = EXPIRY_STATUS_META[bucket];
          return (
            <Box key={bucket}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Typography variant="h6">{BUCKET_LABEL[bucket]}</Typography>
                <StatusPill label={rows.length} color={meta.color} soft={meta.soft} />
              </Box>
              <Card sx={{ overflow: "hidden" }}>
                {rows.map((b, i) => {
                  const catMeta = CATEGORY_META[b.product.category];
                  const d = daysUntil(b.expiryDate);
                  return (
                    <Box
                      key={`${b.product.id}-${b.batchNo}`}
                      sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderTop: i > 0 ? "1px solid" : "none", borderColor: "divider" }}
                    >
                      <CategoryIcon category={b.product.category} sx={{ color: catMeta.color, fontSize: 20, flexShrink: 0 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }} noWrap>
                          {b.product.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          Batch {b.batchNo} · expires {formatDate(b.expiryDate)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                        <Typography sx={{ fontWeight: 900, fontSize: "0.95rem" }}>
                          {b.qty} {b.product.unit}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Card>
            </Box>
          );
        })}
      </Box>
    </ReportGate>
  );
}
