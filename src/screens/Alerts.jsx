import { useMemo, useState } from "react";
import { Box, Card, Tab, Tabs, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useInventoryState } from "../context/InventoryContext";
import {
  EXPIRY_STATUS_META,
  STOCK_STATUS_META,
  daysUntil,
  formatDate,
  getAllBatchesWithProduct,
  getExpiryStatus,
  getProductQty,
  getStockLevelStatus,
} from "../utils/inventoryHelpers";
import AlertCard from "../components/alerts/AlertCard";
import EmptyState from "../components/common/EmptyState";
import { brand } from "../theme";

export default function Alerts() {
  const { products } = useInventoryState();
  const [tab, setTab] = useState(0);

  const lowStock = useMemo(() => {
    const rank = { critical: 0, low: 1 };
    return products
      .filter((p) => getStockLevelStatus(p) !== "ok")
      .sort((a, b) => rank[getStockLevelStatus(a)] - rank[getStockLevelStatus(b)]);
  }, [products]);

  const expiring = useMemo(() => {
    return getAllBatchesWithProduct(products)
      .filter((b) => getExpiryStatus(b.expiryDate) !== "ok")
      .sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate));
  }, [products]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 900 }}>
        Alerts
      </Typography>

      <Card sx={{ p: 0.5 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          TabIndicatorProps={{ style: { display: "none" } }}
        >
          <Tab
            label={`Low stock (${lowStock.length})`}
            sx={{ borderRadius: "10px", "&.Mui-selected": { backgroundColor: "#FCF0DA", color: "#B8790E" } }}
          />
          <Tab
            label={`Expiry (${expiring.length})`}
            sx={{ borderRadius: "10px", "&.Mui-selected": { backgroundColor: "#FBE4E4", color: brand.danger } }}
          />
        </Tabs>
      </Card>

      {tab === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {lowStock.length === 0 ? (
            <EmptyState icon={<CheckCircleRoundedIcon />} tone="positive" title="All stocked up" subtitle="No products are running low right now." />
          ) : (
            lowStock.map((p) => {
              const status = getStockLevelStatus(p);
              const meta = STOCK_STATUS_META[status];
              return (
                <AlertCard
                  key={p.id}
                  product={p}
                  title={p.name}
                  subtitle={`${getProductQty(p)} ${p.unit} left · reorder at ${p.reorderLevel} ${p.unit}`}
                  pillLabel={meta.label}
                  pillColor={meta.color}
                  pillSoft={meta.soft}
                />
              );
            })
          )}
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {expiring.length === 0 ? (
            <EmptyState icon={<CheckCircleRoundedIcon />} tone="positive" title="Nothing expiring" subtitle="No batches are near their expiry date." />
          ) : (
            expiring.map((b) => {
              const status = getExpiryStatus(b.expiryDate);
              const meta = EXPIRY_STATUS_META[status];
              const d = daysUntil(b.expiryDate);
              return (
                <AlertCard
                  key={`${b.product.id}-${b.batchNo}`}
                  product={b.product}
                  title={b.product.name}
                  subtitle={`Batch ${b.batchNo} · expires ${formatDate(b.expiryDate)}`}
                  pillLabel={`${meta.label} · ${d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`}`}
                  pillColor={meta.color}
                  pillSoft={meta.soft}
                />
              );
            })
          )}
        </Box>
      )}
    </Box>
  );
}
