import { useMemo, useState } from "react";
import { Box, Card, LinearProgress, MenuItem, TextField, Typography } from "@mui/material";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useInventoryState } from "../../context/InventoryContext";
import { CATEGORIES, CATEGORY_META, getProductQty, getProductValue } from "../../utils/inventoryHelpers";
import { exportToCsv } from "../../utils/csv";
import { CategoryIcon } from "../../utils/categoryIcons";
import StatCard from "../../components/common/StatCard";
import ReportGate from "../../components/reports/ReportGate";
import ReportHeader from "../../components/reports/ReportHeader";
import { brand } from "../../theme";

const money = (n) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

export default function StockValuationReport() {
  const { products } = useInventoryState();
  const [sortBy, setSortBy] = useState("value");

  const rows = useMemo(
    () =>
      products.map((p) => ({
        product: p,
        qty: getProductQty(p),
        value: getProductValue(p),
        hasPrice: p.pricePerUnit != null,
      })),
    [products]
  );

  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  const totalUnits = rows.reduce((sum, r) => sum + r.qty, 0);
  const missingPriceCount = rows.filter((r) => !r.hasPrice).length;

  const byCategory = useMemo(() => {
    return CATEGORIES.map((c) => {
      const catRows = rows.filter((r) => r.product.category === c);
      const value = catRows.reduce((sum, r) => sum + r.value, 0);
      const qty = catRows.reduce((sum, r) => sum + r.qty, 0);
      return { category: c, value, qty, skus: catRows.length };
    }).filter((c) => c.skus > 0);
  }, [rows]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    if (sortBy === "value") copy.sort((a, b) => b.value - a.value);
    if (sortBy === "qty") copy.sort((a, b) => b.qty - a.qty);
    if (sortBy === "name") copy.sort((a, b) => a.product.name.localeCompare(b.product.name));
    return copy;
  }, [rows, sortBy]);

  const handleExport = () => {
    exportToCsv(
      "stock-valuation",
      sortedRows.map((r) => ({
        Product: r.product.name,
        Category: r.product.category,
        Quantity: r.qty,
        Unit: r.product.unit,
        UnitPrice: r.product.pricePerUnit ?? "",
        TotalValue: r.value,
      }))
    );
  };

  return (
    <ReportGate>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <ReportHeader
          title="Stock Valuation"
          backTo="/reports"
          subtitle="What the warehouse is worth right now, by category and by product."
          onExport={handleExport}
        />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
          <StatCard icon={<PaidRoundedIcon />} label="Total stock value" value={money(totalValue)} color={brand.primaryDark} />
          <StatCard icon={<Inventory2RoundedIcon />} label="Total units on hand" value={totalUnits} color={brand.primary} />
          <StatCard
            icon={<WarningAmberRoundedIcon />}
            label="Products missing a price"
            value={missingPriceCount}
            color="#B8790E"
            soft={missingPriceCount ? "#FCF0DA" : undefined}
          />
        </Box>

        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Value by category
          </Typography>
          <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {byCategory.map((c) => {
              const meta = CATEGORY_META[c.category];
              const pct = totalValue > 0 ? (c.value / totalValue) * 100 : 0;
              return (
                <Box key={c.category}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <CategoryIcon category={c.category} sx={{ color: meta.color, fontSize: 18 }} />
                      <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{c.category}</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        ({c.skus} SKU{c.skus !== 1 ? "s" : ""})
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>{money(c.value)}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 8,
                      borderRadius: 5,
                      backgroundColor: meta.soft,
                      "& .MuiLinearProgress-bar": { backgroundColor: meta.color, borderRadius: 5 },
                    }}
                  />
                </Box>
              );
            })}
          </Card>
        </Box>

        <Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="h6">By product</Typography>
            <TextField select size="small" value={sortBy} onChange={(e) => setSortBy(e.target.value)} sx={{ width: 160 }}>
              <MenuItem value="value">Sort: Value</MenuItem>
              <MenuItem value="qty">Sort: Quantity</MenuItem>
              <MenuItem value="name">Sort: Name</MenuItem>
            </TextField>
          </Box>
          <Card sx={{ overflow: "hidden" }}>
            {sortedRows.map((r, i) => (
              <Box
                key={r.product.id}
                sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderTop: i > 0 ? "1px solid" : "none", borderColor: "divider" }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }} noWrap>
                    {r.product.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {r.qty} {r.product.unit} {r.hasPrice ? `× KES ${r.product.pricePerUnit}` : "· no price set"}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 900, flexShrink: 0 }}>{money(r.value)}</Typography>
              </Box>
            ))}
          </Card>
        </Box>
      </Box>
    </ReportGate>
  );
}
