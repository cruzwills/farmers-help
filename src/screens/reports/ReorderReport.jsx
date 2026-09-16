import { useMemo } from "react";
import { Box, Card, Typography } from "@mui/material";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useInventoryState } from "../../context/InventoryContext";
import { CATEGORY_META, getProductQty, getStockLevelStatus, STOCK_STATUS_META } from "../../utils/inventoryHelpers";
import { exportToCsv } from "../../utils/csv";
import { CategoryIcon } from "../../utils/categoryIcons";
import StatCard from "../../components/common/StatCard";
import StatusPill from "../../components/common/StatusPill";
import EmptyState from "../../components/common/EmptyState";
import ReportGate from "../../components/reports/ReportGate";
import ReportHeader from "../../components/reports/ReportHeader";
import { brand } from "../../theme";
import { formatMoney as money } from "../../utils/currency";

export default function ReorderReport() {
  const { products } = useInventoryState();

  const rows = useMemo(() => {
    const rank = { out: 0, critical: 1, low: 2, ok: 3 };
    return products
      .map((p) => {
        const qty = getProductQty(p);
        const status = getStockLevelStatus(p);
        // simple restock heuristic: top back up to 2x the reorder point
        const suggestedQty = Math.max(0, p.reorderLevel * 2 - qty);
        return { product: p, qty, status, suggestedQty, suggestedValue: suggestedQty * (p.pricePerUnit || 0) };
      })
      .filter((r) => r.status !== "ok")
      .sort((a, b) => rank[a.status] - rank[b.status]);
  }, [products]);

  const totalSuggestedValue = rows.reduce((sum, r) => sum + r.suggestedValue, 0);

  const handleExport = () => {
    exportToCsv(
      "reorder-report",
      rows.map((r) => ({
        Product: r.product.name,
        Category: r.product.category,
        CurrentQty: r.qty,
        ReorderLevel: r.product.reorderLevel,
        Unit: r.product.unit,
        Status: STOCK_STATUS_META[r.status].label,
        SuggestedReorderQty: r.suggestedQty,
        SuggestedReorderValue: r.suggestedValue,
      }))
    );
  };

  return (
    <ReportGate>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <ReportHeader
          title="Reorder Report"
          backTo="/reports"
          subtitle="Products at or below their reorder level, with a suggested restock quantity (tops back up to 2× the reorder point)."
          onExport={rows.length ? handleExport : undefined}
        />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
          <StatCard icon={<TrendingDownRoundedIcon />} label="Products needing reorder" value={rows.length} color="#B8790E" soft={rows.length ? "#FCF0DA" : undefined} />
          <StatCard icon={<ShoppingCartRoundedIcon />} label="Total units suggested" value={rows.reduce((s, r) => s + r.suggestedQty, 0)} color={brand.primary} />
          <StatCard icon={<PaidRoundedIcon />} label="Estimated reorder cost" value={money(totalSuggestedValue)} color={brand.primaryDark} />
        </Box>

        {rows.length === 0 ? (
          <EmptyState
            icon={<CheckCircleRoundedIcon />}
            tone="positive"
            title="Nothing to restock"
            subtitle="Every product is above its reorder level."
          />
        ) : (
          <Card sx={{ overflow: "hidden" }}>
            {rows.map((r, i) => {
              const meta = CATEGORY_META[r.product.category];
              const statusMeta = STOCK_STATUS_META[r.status];
              return (
                <Box
                  key={r.product.id}
                  sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.75, borderTop: i > 0 ? "1px solid" : "none", borderColor: "divider" }}
                >
                  <CategoryIcon category={r.product.category} sx={{ color: meta.color, fontSize: 22, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.92rem" }} noWrap>
                      {r.product.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {r.qty} / {r.product.reorderLevel} {r.product.unit} reorder level
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <StatusPill label={statusMeta.label} color={statusMeta.color} soft={statusMeta.soft} />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: "1rem", color: brand.primaryDark }}>
                      +{r.suggestedQty} {r.product.unit}
                    </Typography>
                    {r.product.pricePerUnit != null && (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        ≈ {money(r.suggestedValue)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Card>
        )}
      </Box>
    </ReportGate>
  );
}
