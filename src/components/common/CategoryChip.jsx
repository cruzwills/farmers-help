import { Chip } from "@mui/material";
import { CATEGORY_META } from "../../utils/inventoryHelpers";
import { CategoryIcon } from "../../utils/categoryIcons";

export default function CategoryChip({ category, size = "small" }) {
  const meta = CATEGORY_META[category];
  if (!meta) return null;
  return (
    <Chip
      size={size}
      icon={<CategoryIcon category={category} sx={{ color: `${meta.color} !important`, fontSize: 18 }} />}
      label={meta.label}
      sx={{
        backgroundColor: meta.soft,
        color: meta.color,
        border: `1.5px solid ${meta.color}33`,
      }}
    />
  );
}
