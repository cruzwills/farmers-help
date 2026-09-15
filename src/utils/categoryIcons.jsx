import GrassIcon from "@mui/icons-material/Grass";
import BugReportIcon from "@mui/icons-material/BugReport";
import ScienceIcon from "@mui/icons-material/Science";
import YardIcon from "@mui/icons-material/Yard";

export const CATEGORY_ICONS = {
  Herbicide: GrassIcon,
  Insecticide: BugReportIcon,
  Fungicide: ScienceIcon,
  Fertilizer: YardIcon,
};

export function CategoryIcon({ category, ...props }) {
  const Icon = CATEGORY_ICONS[category] || GrassIcon;
  return <Icon {...props} />;
}
