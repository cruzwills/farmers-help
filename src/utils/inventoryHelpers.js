export const CATEGORIES = ["Herbicide", "Insecticide", "Fungicide", "Fertilizer"];

export const CATEGORY_META = {
  Herbicide: { color: "#3F7D3A", soft: "#E7F0E4", icon: "Grass", label: "Herbicide" },
  Insecticide: { color: "#C85A17", soft: "#FBEBE0", icon: "BugReport", label: "Insecticide" },
  Fungicide: { color: "#5C4B8A", soft: "#ECE8F5", icon: "Science", label: "Fungicide" },
  Fertilizer: { color: "#8B5E34", soft: "#F1E9DE", icon: "Yard", label: "Fertilizer" },
};

export const CATEGORY_PREFIX = {
  Herbicide: "HRB",
  Insecticide: "INS",
  Fungicide: "FUN",
  Fertilizer: "FRT",
};

export const FORMULATIONS = ["SL", "WP", "EC", "WG", "SC", "Granular", "Dust"];
export const UNITS = ["L", "Kg", "Bag", "Bottle", "Sachet"];

// e.g. next id for Herbicide when HRB-001..HRB-003 exist -> HRB-004
export function generateProductId(category, products) {
  const prefix = CATEGORY_PREFIX[category] || "GEN";
  const numbers = products
    .filter((p) => p.id.startsWith(`${prefix}-`))
    .map((p) => parseInt(p.id.split("-")[1], 10))
    .filter((n) => !Number.isNaN(n));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(dateStr) {
  const ms = new Date(dateStr + "T00:00:00") - new Date(today() + "T00:00:00");
  return Math.round(ms / 86400000);
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

// expiry status of a single batch
export function getExpiryStatus(expiryDate) {
  const d = daysUntil(expiryDate);
  if (d < 0) return "expired";
  if (d <= 30) return "critical";
  if (d <= 90) return "warning";
  return "ok";
}

export const EXPIRY_STATUS_META = {
  expired: { label: "Expired", color: "#C1272D", soft: "#FBE4E4" },
  critical: { label: "Expiring soon", color: "#C1272D", soft: "#FBE4E4" },
  warning: { label: "Watch expiry", color: "#B8790E", soft: "#FCF0DA" },
  ok: { label: "Good", color: "#2F6B3A", soft: "#E7F0E4" },
};

export function getProductQty(product) {
  return product.batches.reduce((sum, b) => sum + b.qty, 0);
}

export function getProductValue(product) {
  return getProductQty(product) * (product.pricePerUnit || 0);
}

// worst expiry status among batches that still have stock
export function getProductExpiryStatus(product) {
  const order = { expired: 0, critical: 1, warning: 2, ok: 3 };
  let worst = "ok";
  product.batches
    .filter((b) => b.qty > 0)
    .forEach((b) => {
      const s = getExpiryStatus(b.expiryDate);
      if (order[s] < order[worst]) worst = s;
    });
  return worst;
}

export function getStockLevelStatus(product) {
  const qty = getProductQty(product);
  if (qty <= 0) return "out";
  if (qty <= product.reorderLevel * 0.5) return "critical";
  if (qty <= product.reorderLevel) return "low";
  return "ok";
}

export const STOCK_STATUS_META = {
  out: { label: "Out of stock", color: "#C1272D", soft: "#FBE4E4" },
  critical: { label: "Critical low", color: "#C1272D", soft: "#FBE4E4" },
  low: { label: "Low stock", color: "#B8790E", soft: "#FCF0DA" },
  ok: { label: "Healthy", color: "#2F6B3A", soft: "#E7F0E4" },
};

export function sortBatchesByExpiry(batches) {
  return [...batches].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
}

export function getAllBatchesWithProduct(products) {
  const rows = [];
  products.forEach((p) => {
    p.batches.forEach((b) => {
      if (b.qty > 0) rows.push({ ...b, product: p });
    });
  });
  return rows;
}
