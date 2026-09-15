import { Box, Button, Card, Typography } from "@mui/material";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import ScaleRoundedIcon from "@mui/icons-material/ScaleRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useNavigate } from "react-router-dom";
import { useInventoryState } from "../context/InventoryContext";
import {
  getAllBatchesWithProduct,
  getExpiryStatus,
  getProductQty,
  getStockLevelStatus,
} from "../utils/inventoryHelpers";
import StatCard from "../components/common/StatCard";
import AlertCard from "../components/alerts/AlertCard";
import MovementItem from "../components/activity/MovementItem";
import { brand } from "../theme";

export default function Dashboard() {
  const navigate = useNavigate();
  const { products, movements } = useInventoryState();

  const totalSkus = products.length;
  const totalUnits = products.reduce((sum, p) => sum + getProductQty(p), 0);
  const lowStockProducts = products.filter((p) => getStockLevelStatus(p) !== "ok");
  const expiringBatches = getAllBatchesWithProduct(products).filter((b) => {
    const s = getExpiryStatus(b.expiryDate);
    return s === "critical" || s === "expired";
  });

  const urgentItems = [
    ...expiringBatches.map((b) => ({
      key: `exp-${b.product.id}-${b.batchNo}`,
      product: b.product,
      title: b.product.name,
      subtitle: `Batch ${b.batchNo}`,
      pillLabel: getExpiryStatus(b.expiryDate) === "expired" ? "Expired" : "Expiring soon",
      pillColor: "#C1272D",
      pillSoft: "#FBE4E4",
      rank: getExpiryStatus(b.expiryDate) === "expired" ? 0 : 1,
    })),
    ...lowStockProducts.map((p) => ({
      key: `low-${p.id}`,
      product: p,
      title: p.name,
      subtitle: p.activeIngredient,
      pillLabel: getStockLevelStatus(p) === "critical" ? "Critical low" : "Low stock",
      pillColor: getStockLevelStatus(p) === "critical" ? "#C1272D" : "#B8790E",
      pillSoft: getStockLevelStatus(p) === "critical" ? "#FBE4E4" : "#FCF0DA",
      rank: 2,
    })),
  ]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 4);

  const todayStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Stock Overview
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
          {todayStr}
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1.5 }}>
        <StatCard
          icon={<Inventory2RoundedIcon />}
          label="Products tracked"
          value={totalSkus}
          color={brand.primaryDark}
          onClick={() => navigate("/inventory")}
        />
        <StatCard
          icon={<ScaleRoundedIcon />}
          label="Units in stock"
          value={totalUnits}
          color={brand.primary}
          onClick={() => navigate("/inventory")}
        />
        <StatCard
          icon={<TrendingDownRoundedIcon />}
          label="Low stock items"
          value={lowStockProducts.length}
          color="#B8790E"
          soft={lowStockProducts.length ? "#FCF0DA" : undefined}
          onClick={() => navigate("/alerts")}
        />
        <StatCard
          icon={<EventBusyRoundedIcon />}
          label="Expiring / expired batches"
          value={expiringBatches.length}
          color="#C1272D"
          soft={expiringBatches.length ? "#FBE4E4" : undefined}
          onClick={() => navigate("/alerts")}
        />
      </Box>

      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2.5, alignItems: "flex-start" }}>
      <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h6">Needs attention</Typography>
          <Button size="small" onClick={() => navigate("/alerts")} sx={{ fontWeight: 700, minHeight: "auto" }}>
            View all
          </Button>
        </Box>
        {urgentItems.length === 0 ? (
          <Card sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 1.5, backgroundColor: "#E7F0E4" }}>
            <CheckCircleRoundedIcon sx={{ color: brand.primaryDark }} />
            <Typography sx={{ fontWeight: 700, color: brand.primaryDark }}>
              All stock levels healthy — nothing needs attention.
            </Typography>
          </Card>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {urgentItems.map((item) => (
              <AlertCard
                key={item.key}
                product={item.product}
                title={item.title}
                subtitle={item.subtitle}
                pillLabel={item.pillLabel}
                pillColor={item.pillColor}
                pillSoft={item.pillSoft}
              />
            ))}
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h6">Recent activity</Typography>
          <Button size="small" onClick={() => navigate("/activity")} sx={{ fontWeight: 700, minHeight: "auto" }}>
            View all
          </Button>
        </Box>
        <Card sx={{ px: 1.5 }}>
          {movements.slice(0, 4).map((m, i) => (
            <Box key={m.id} sx={{ borderBottom: i < 3 ? "1px solid" : "none", borderColor: "divider" }}>
              <MovementItem movement={m} />
            </Box>
          ))}
        </Card>
      </Box>
      </Box>
    </Box>
  );
}
