import { createTheme } from "@mui/material/styles";

// Visual identity for Farmer's Help, an agrochemical distribution
// business: earthy, high-contrast, "field label" look — not a generic
// SaaS dashboard. Warm parchment background + strong ink text reads
// well in bright outdoor light; primary/accent are sampled from the
// actual company logo (tractor mark) so the app matches it exactly;
// category colours echo crop-protection/fertiliser packaging rather
// than a corporate blue/purple palette.
export const brand = {
  ink: "#1B1B16",
  inkSoft: "#5B5A4A",
  paper: "#F6F2E7",
  surface: "#FFFFFF",
  line: "#E4DCC7",
  primary: "#1F6B3E",
  primaryDark: "#14532D",
  accent: "#F5A623",
  danger: "#C1272D",
};

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: brand.primary, dark: brand.primaryDark, contrastText: "#FFFFFF" },
    secondary: { main: brand.accent, contrastText: "#1B1B16" },
    error: { main: brand.danger },
    warning: { main: "#B8790E" },
    success: { main: brand.primary },
    background: { default: brand.paper, paper: brand.surface },
    text: { primary: brand.ink, secondary: brand.inkSoft },
    divider: brand.line,
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 900 },
    h2: { fontWeight: 900 },
    h3: { fontWeight: 900 },
    h4: { fontWeight: 900 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 800 },
    button: { fontWeight: 800, textTransform: "none" },
    body1: { fontSize: "1rem" },
    body2: { fontSize: "0.9rem" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { WebkitTextSizeAdjust: "100%" },
        body: { backgroundColor: brand.paper },
        "*": { WebkitTapHighlightColor: "transparent" },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: 12,
          fontSize: "1rem",
          fontWeight: 800,
          paddingLeft: 20,
          paddingRight: 20,
        },
        contained: { boxShadow: "none" },
        containedPrimary: { "&:hover": { boxShadow: "none" } },
        outlined: { borderWidth: 2, "&:hover": { borderWidth: 2 } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1.5px solid ${brand.line}`,
          boxShadow: "none",
          backgroundImage: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        // default MUI chip height (32px) is a bit small as a tap target for
        // an outdoor/gloved-hand context — bump it up across the board
        // (category filters, demo-login chips, role badges, etc.)
        root: { fontWeight: 800, borderRadius: 8, minHeight: 40 },
        label: { paddingLeft: 10, paddingRight: 10 },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiTextField: {
      defaultProps: { size: "medium" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 12, minHeight: 52 },
        notchedOutline: { borderWidth: 1.5, borderColor: brand.line },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        // ensure even "small" icon buttons (edit/delete/close/show-password)
        // keep a comfortable tap target — the icon itself can stay compact,
        // but the clickable area shouldn't drop below ~44px
        root: { borderRadius: 12, minWidth: 44, minHeight: 44 },
        sizeSmall: { minWidth: 40, minHeight: 40 },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 0,
          paddingLeft: 2,
          paddingRight: 2,
          paddingTop: 10,
          color: brand.inkSoft,
          transition: "color 0.15s ease",
          "&.Mui-selected": { color: brand.primaryDark },
        },
        label: {
          fontSize: "0.66rem",
          fontWeight: 700,
          width: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          transition: "font-size 0.15s ease",
          "&.Mui-selected": { fontSize: "0.68rem" },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { fontWeight: 800, textTransform: "none", fontSize: "0.95rem", minHeight: 52 },
      },
    },
  },
});

// spread into a clickable Card/Box that navigates on click (ProductCard,
// AlertCard, StatCard, report tiles, etc.) so it's also reachable and
// operable by keyboard — a bare onClick on a non-button element is invisible
// to tab order and Enter/Space, which is exactly the kind of "not actually
// interactive" gap this app shouldn't have on its most-used surfaces.
export function clickableCardA11yProps(onClick) {
  if (!onClick) return {};
  return {
    role: "button",
    tabIndex: 0,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(e);
      }
    },
  };
}

// spread into the sx of any clickable Card/Box for a consistent, subtle
// hover/press affordance (desktop pointer hover + touch press feedback)
export const interactiveCardSx = {
  cursor: "pointer",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease",
  "&:hover": {
    borderColor: brand.primary,
    boxShadow: "0 4px 14px rgba(20, 83, 45, 0.10)",
  },
  "&:active": { transform: "scale(0.99)" },
  "&:focus-visible": {
    outline: `2.5px solid ${brand.primary}`,
    outlineOffset: 2,
  },
};

// for a clickable row inside a Card/list (no border of its own to
// highlight) — a soft background tint instead of the card-level lift
export const interactiveRowSx = {
  cursor: "pointer",
  transition: "background-color 0.15s ease",
  "&:hover": { backgroundColor: brand.paper },
  "&:active": { backgroundColor: `${brand.line}` },
};

export default theme;
