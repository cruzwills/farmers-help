import { Box, Card, Typography } from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useNavigate } from "react-router-dom";
import { CategoryIcon } from "../../utils/categoryIcons";
import {
  CATEGORY_META,
  getProductExpiryStatus,
  getProductQty,
  getStockLevelStatus,
  STOCK_STATUS_META,
} from "../../utils/inventoryHelpers";
import StatusPill from "../common/StatusPill";
import { clickableCardA11yProps, interactiveCardSx } from "../../theme";

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const meta = CATEGORY_META[product.category];
  const qty = getProductQty(product);
  const stockStatus = getStockLevelStatus(product);
  const expiryStatus = getProductExpiryStatus(product);
  const stockMeta = STOCK_STATUS_META[stockStatus];

  const goToDetail = () => navigate(`/inventory/${product.id}`);

  return (
    <Card
      onClick={goToDetail}
      {...clickableCardA11yProps(goToDetail)}
      sx={{
        display: "flex",
        overflow: "hidden",
        ...interactiveCardSx,
      }}
    >
      <Box sx={{ width: 6, backgroundColor: meta.color, flexShrink: 0 }} />
      <Box sx={{ flex: 1, p: 1.5, display: "flex", gap: 1.5, alignItems: "center", minWidth: 0 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            backgroundColor: meta.soft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CategoryIcon category={product.category} sx={{ color: meta.color }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "1rem" }} noWrap>
            {product.name}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
            {product.activeIngredient}
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75, mt: 0.75, flexWrap: "wrap" }}>
            <StatusPill label={stockMeta.label} color={stockMeta.color} soft={stockMeta.soft} />
            {(expiryStatus === "critical" || expiryStatus === "expired") && (
              <StatusPill
                label={expiryStatus === "expired" ? "Expired batch" : "Expiring soon"}
                color="#C1272D"
                soft="#FBE4E4"
                icon={<WarningAmberRoundedIcon sx={{ fontSize: 14 }} />}
              />
            )}
          </Box>
        </Box>
        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography sx={{ fontWeight: 900, fontSize: "1.3rem", lineHeight: 1 }}>{qty}</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
            {product.unit}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}
