import { addDays } from "../utils/inventoryHelpers.js";

// Sample catalogue for an agrochemical (crop-protection + fertilizer)
// distribution business. Expiry dates are generated relative to "today"
// so the demo always has a realistic mix of healthy / near-expiry /
// expired batches no matter when it is run.
export const seedProducts = [
  {
    id: "HRB-001",
    name: "RoundClear 41SL",
    activeIngredient: "Glyphosate 41% SL",
    category: "Herbicide",
    formulation: "SL",
    unit: "L",
    packSize: "5 L Jerrycan",
    manufacturer: "AgroCore Chemicals",
    reorderLevel: 60,
    pricePerUnit: 850,
    batches: [
      { batchNo: "GLY-24A12", mfgDate: addDays(new Date(), -420), expiryDate: addDays(new Date(), 12), qty: 18 },
      { batchNo: "GLY-24C07", mfgDate: addDays(new Date(), -90), expiryDate: addDays(new Date(), 430), qty: 65 },
    ],
  },
  {
    id: "HRB-002",
    name: "AtraGuard 50WP",
    activeIngredient: "Atrazine 50% WP",
    category: "Herbicide",
    formulation: "WP",
    unit: "Kg",
    packSize: "1 Kg Pouch",
    manufacturer: "Novagri Sciences",
    reorderLevel: 80,
    pricePerUnit: 420,
    batches: [
      { batchNo: "ATZ-23B04", mfgDate: addDays(new Date(), -300), expiryDate: addDays(new Date(), 55), qty: 24 },
      { batchNo: "ATZ-24D19", mfgDate: addDays(new Date(), -40), expiryDate: addDays(new Date(), 520), qty: 90 },
    ],
  },
  {
    id: "HRB-003",
    name: "QuickKill 24SL",
    activeIngredient: "Paraquat Dichloride 24% SL",
    category: "Herbicide",
    formulation: "SL",
    unit: "L",
    packSize: "1 L Bottle",
    manufacturer: "AgroCore Chemicals",
    reorderLevel: 50,
    pricePerUnit: 610,
    batches: [{ batchNo: "PQT-24A02", mfgDate: addDays(new Date(), -200), expiryDate: addDays(new Date(), 260), qty: 41 }],
  },
  {
    id: "INS-001",
    name: "ImidaShield 17.8SL",
    activeIngredient: "Imidacloprid 17.8% SL",
    category: "Insecticide",
    formulation: "SL",
    unit: "L",
    packSize: "500 mL Bottle",
    manufacturer: "Cropvantis Ltd",
    reorderLevel: 40,
    pricePerUnit: 980,
    batches: [
      { batchNo: "IMD-24E11", mfgDate: addDays(new Date(), -60), expiryDate: addDays(new Date(), -5), qty: 6 },
      { batchNo: "IMD-24F03", mfgDate: addDays(new Date(), -10), expiryDate: addDays(new Date(), 340), qty: 22 },
    ],
  },
  {
    id: "INS-002",
    name: "CyroMax 20EC",
    activeIngredient: "Chlorpyrifos 20% EC",
    category: "Insecticide",
    formulation: "EC",
    unit: "L",
    packSize: "1 L Bottle",
    manufacturer: "Novagri Sciences",
    reorderLevel: 45,
    pricePerUnit: 740,
    batches: [{ batchNo: "CPF-24B22", mfgDate: addDays(new Date(), -150), expiryDate: addDays(new Date(), 21), qty: 38 }],
  },
  {
    id: "INS-003",
    name: "CyperGuard 10EC",
    activeIngredient: "Cypermethrin 10% EC",
    category: "Insecticide",
    formulation: "EC",
    unit: "L",
    packSize: "1 L Bottle",
    manufacturer: "Cropvantis Ltd",
    reorderLevel: 35,
    pricePerUnit: 560,
    batches: [{ batchNo: "CYP-24C15", mfgDate: addDays(new Date(), -80), expiryDate: addDays(new Date(), 610), qty: 57 }],
  },
  {
    id: "FUN-001",
    name: "MancoStop 75WP",
    activeIngredient: "Mancozeb 75% WP",
    category: "Fungicide",
    formulation: "WP",
    unit: "Kg",
    packSize: "1 Kg Pouch",
    manufacturer: "Greenfield Agro",
    reorderLevel: 70,
    pricePerUnit: 390,
    batches: [
      { batchNo: "MNZ-23F09", mfgDate: addDays(new Date(), -330), expiryDate: addDays(new Date(), 8), qty: 12 },
      { batchNo: "MNZ-24H01", mfgDate: addDays(new Date(), -20), expiryDate: addDays(new Date(), 470), qty: 88 },
    ],
  },
  {
    id: "FUN-002",
    name: "CopperShield 50WP",
    activeIngredient: "Copper Oxychloride 50% WP",
    category: "Fungicide",
    formulation: "WP",
    unit: "Kg",
    packSize: "500 g Pouch",
    manufacturer: "Greenfield Agro",
    reorderLevel: 50,
    pricePerUnit: 310,
    batches: [{ batchNo: "COC-24A28", mfgDate: addDays(new Date(), -100), expiryDate: addDays(new Date(), 75), qty: 19 }],
  },
  {
    id: "FUN-003",
    name: "MetaGuard Combi",
    activeIngredient: "Metalaxyl 8% + Mancozeb 64% WP",
    category: "Fungicide",
    formulation: "WP",
    unit: "Kg",
    packSize: "1 Kg Pouch",
    manufacturer: "Cropvantis Ltd",
    reorderLevel: 40,
    pricePerUnit: 455,
    batches: [{ batchNo: "MTG-24D06", mfgDate: addDays(new Date(), -55), expiryDate: addDays(new Date(), 390), qty: 33 }],
  },
  {
    id: "FRT-001",
    name: "GroPlus NPK 15-15-15",
    activeIngredient: "NPK Compound Fertiliser 15-15-15",
    category: "Fertilizer",
    formulation: "Granular",
    unit: "Bag",
    packSize: "50 Kg Bag",
    manufacturer: "Greenfield Agro",
    reorderLevel: 100,
    pricePerUnit: 1250,
    batches: [{ batchNo: "NPK-24C10", mfgDate: addDays(new Date(), -70), expiryDate: addDays(new Date(), 720), qty: 140 }],
  },
  {
    id: "FRT-002",
    name: "UreaMax 46",
    activeIngredient: "Urea 46% N",
    category: "Fertilizer",
    formulation: "Granular",
    unit: "Bag",
    packSize: "50 Kg Bag",
    manufacturer: "Novagri Sciences",
    reorderLevel: 120,
    pricePerUnit: 1080,
    batches: [{ batchNo: "URE-24B14", mfgDate: addDays(new Date(), -95), expiryDate: addDays(new Date(), 640), qty: 34 }],
  },
  {
    id: "FRT-003",
    name: "DAP Gold",
    activeIngredient: "Diammonium Phosphate 18-46-0",
    category: "Fertilizer",
    formulation: "Granular",
    unit: "Bag",
    packSize: "50 Kg Bag",
    manufacturer: "Greenfield Agro",
    reorderLevel: 90,
    pricePerUnit: 1420,
    batches: [{ batchNo: "DAP-24A31", mfgDate: addDays(new Date(), -130), expiryDate: addDays(new Date(), 560), qty: 76 }],
  },
];

function m(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(9 + (daysAgo % 6), 15, 0, 0);
  return d.toISOString();
}

export const seedMovements = [
  { id: "MV-1001", productId: "FRT-001", productName: "GroPlus NPK 15-15-15", batchNo: "NPK-24C10", type: "IN", qty: 60, unit: "Bag", date: m(6), note: "New delivery from Greenfield Agro", performedBy: "David Otieno" },
  { id: "MV-1002", productId: "INS-002", productName: "CyroMax 20EC", batchNo: "CPF-24B22", type: "OUT", qty: 12, unit: "L", date: m(5), note: "Sold to Kariuki Farm Supplies", performedBy: "Grace Wambui" },
  { id: "MV-1003", productId: "HRB-002", productName: "AtraGuard 50WP", batchNo: "ATZ-24D19", type: "IN", qty: 40, unit: "Kg", date: m(4), note: "Restock", performedBy: "David Otieno" },
  {
    id: "MV-1003B",
    productId: "FUN-002",
    productName: "CopperShield 50WP",
    batchNo: "COC-24A28",
    type: "ADJUST",
    qty: -6,
    unit: "Kg",
    date: m(4),
    note: "Warehouse recount — 6 Kg short of system count",
    performedBy: "Amina Njoroge",
  },
  { id: "MV-1004", productId: "FUN-001", productName: "MancoStop 75WP", batchNo: "MNZ-23F09", type: "OUT", qty: 8, unit: "Kg", date: m(3), note: "Sold to Wanjiru Agrovet", performedBy: "Grace Wambui" },
  { id: "MV-1005", productId: "INS-001", productName: "ImidaShield 17.8SL", batchNo: "IMD-24F03", type: "OUT", qty: 5, unit: "L", date: m(2), note: "Sold to Mwangi Agrovet", performedBy: "Grace Wambui" },
  {
    id: "MV-1005B",
    productId: "HRB-003",
    productName: "QuickKill 24SL",
    batchNo: "PQT-23A19",
    type: "REMOVE",
    qty: 4,
    unit: "L",
    date: m(2),
    note: "Batch removed / written off — damaged in storage",
    performedBy: "Amina Njoroge",
  },
  { id: "MV-1006", productId: "FRT-003", productName: "DAP Gold", batchNo: "DAP-24A31", type: "IN", qty: 30, unit: "Bag", date: m(1), note: "New delivery", performedBy: "David Otieno" },
  { id: "MV-1007", productId: "HRB-001", productName: "RoundClear 41SL", batchNo: "GLY-24C07", type: "OUT", qty: 15, unit: "L", date: m(0), note: "Sold to Otieno Farm Supplies", performedBy: "Grace Wambui" },
];

// DEMO ONLY: shared password for the pre-seeded accounts, so the app is
// easy to try immediately after `npm run dev:all` without an admin
// having to invite anyone first. Users invited later set their own
// password via the real /activate flow.
export const DEMO_SEED_PASSWORD = "Password123!";

export const seedUsers = [
  { id: "U1", name: "Amina Njoroge", username: "amina", email: "amina@farmershelp.co.ke", role: "Admin", active: true, status: "active", password: DEMO_SEED_PASSWORD },
  { id: "U2", name: "David Otieno", username: "david", email: "david@farmershelp.co.ke", role: "Manager", active: true, status: "active", password: DEMO_SEED_PASSWORD },
  { id: "U3", name: "Grace Wambui", username: "grace", email: "grace@farmershelp.co.ke", role: "Staff", active: true, status: "active", password: DEMO_SEED_PASSWORD },
];

// No one is signed in until they log in.
export const seedCurrentUserId = null;

export const seedOutbox = [];
