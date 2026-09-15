import { useNavigate } from "react-router-dom";
import { Box, Card, Typography } from "@mui/material";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ReportGate from "../../components/reports/ReportGate";
import { interactiveCardSx } from "../../theme";

const REPORTS = [
  {
    path: "valuation",
    title: "Stock Valuation",
    description: "What the warehouse is worth, by category and product.",
    icon: PaidRoundedIcon,
    color: "#1F4D2C",
    soft: "#E7F0E4",
  },
  {
    path: "movements",
    title: "Stock Movements",
    description: "Stock in vs stock out over any date range.",
    icon: SwapVertRoundedIcon,
    color: "#2F6B3A",
    soft: "#E7F0E4",
  },
  {
    path: "expiry",
    title: "Expiry Report",
    description: "Every batch grouped by shelf life remaining.",
    icon: EventBusyRoundedIcon,
    color: "#C1272D",
    soft: "#FBE4E4",
  },
  {
    path: "reorder",
    title: "Reorder Report",
    description: "What's below reorder level, and how much to order.",
    icon: ShoppingCartRoundedIcon,
    color: "#B8790E",
    soft: "#FCF0DA",
  },
  {
    path: "adjustments",
    title: "Stock Adjustments",
    description: "Manual corrections and write-offs, with who and why.",
    icon: TuneRoundedIcon,
    color: "#5C4B8A",
    soft: "#ECE8F5",
  },
];

export default function ReportsHome() {
  const navigate = useNavigate();

  return (
    <ReportGate>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Reports
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: -1.5 }}>
          Everything exportable as CSV for your records or your accountant.
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.25 }}>
          {REPORTS.map((r) => {
            const Icon = r.icon;
            return (
              <Card
                key={r.path}
                onClick={() => navigate(`/reports/${r.path}`)}
                sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5, ...interactiveCardSx }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "12px",
                    backgroundColor: r.soft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon sx={{ color: r.color }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800 }}>{r.title}</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {r.description}
                  </Typography>
                </Box>
                <ChevronRightRoundedIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
              </Card>
            );
          })}
        </Box>
      </Box>
    </ReportGate>
  );
}
