import { Box, Card, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useNavigate } from "react-router-dom";
import { CategoryIcon } from "../../utils/categoryIcons";
import { CATEGORY_META } from "../../utils/inventoryHelpers";
import StatusPill from "../common/StatusPill";
import { clickableCardA11yProps, interactiveCardSx } from "../../theme";

export default function AlertCard({ product, title, subtitle, pillLabel, pillColor, pillSoft }) {
  const navigate = useNavigate();
  const meta = CATEGORY_META[product.category];
  const goToDetail = () => navigate(`/inventory/${product.id}`);

  return (
    <Card
      onClick={goToDetail}
      {...clickableCardA11yProps(goToDetail)}
      sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, ...interactiveCardSx }}
    >
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
        <Typography sx={{ fontWeight: 800 }} noWrap>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
          {subtitle}
        </Typography>
        <Box sx={{ mt: 0.5 }}>
          <StatusPill label={pillLabel} color={pillColor} soft={pillSoft} />
        </Box>
      </Box>
      <ChevronRightRoundedIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
    </Card>
  );
}
