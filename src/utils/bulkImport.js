import * as XLSX from "xlsx";
import { CATEGORIES, UNITS, today } from "./inventoryHelpers";

export const TEMPLATE_COLUMNS = [
  "Product Name",
  "Category",
  "Active Ingredient",
  "Formulation",
  "Unit",
  "Pack Size",
  "Manufacturer",
  "Reorder Level",
  "Price Per Unit",
  "Batch Number",
  "Manufacture Date",
  "Expiry Date",
  "Quantity",
];

// Required only the first time a product name appears in the file (a new
// product); a repeat of the same name is treated as another batch for it
// and only needs the batch columns.
const NEW_PRODUCT_REQUIRED_COLUMNS = [
  "Category",
  "Active Ingredient",
  "Unit",
  "Pack Size",
  "Manufacturer",
  "Reorder Level",
];

function addDaysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildTemplateWorkbook() {
  const rows = [
    {
      "Product Name": "BioGrow 20SL",
      Category: "Herbicide",
      "Active Ingredient": "Glyphosate 20% SL",
      Formulation: "SL",
      Unit: "L",
      "Pack Size": "5 L Jerrycan",
      Manufacturer: "Greenfield Agro",
      "Reorder Level": 50,
      "Price Per Unit": 780,
      "Batch Number": "GLY-25A01",
      "Manufacture Date": addDaysFromNow(-10),
      "Expiry Date": addDaysFromNow(365),
      Quantity: 40,
    },
    {
      "Product Name": "BioGrow 20SL",
      Category: "",
      "Active Ingredient": "",
      Formulation: "",
      Unit: "",
      "Pack Size": "",
      Manufacturer: "",
      "Reorder Level": "",
      "Price Per Unit": "",
      "Batch Number": "GLY-25A02",
      "Manufacture Date": addDaysFromNow(-2),
      "Expiry Date": addDaysFromNow(400),
      Quantity: 20,
    },
    {
      "Product Name": "RoundClear 41SL",
      Category: "",
      "Active Ingredient": "",
      Formulation: "",
      Unit: "",
      "Pack Size": "",
      Manufacturer: "",
      "Reorder Level": "",
      "Price Per Unit": "",
      "Batch Number": "GLY-25C03",
      "Manufacture Date": addDaysFromNow(0),
      "Expiry Date": addDaysFromNow(500),
      Quantity: 25,
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(rows, { header: TEMPLATE_COLUMNS });
  sheet["!cols"] = TEMPLATE_COLUMNS.map((c) => ({ wch: Math.max(14, c.length + 2) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Stock Upload");
  return workbook;
}

export function downloadTemplate() {
  XLSX.writeFile(buildTemplateWorkbook(), "farmers-help-stock-upload-template.xlsx");
}

export async function parseWorkbookFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false, dateNF: "yyyy-mm-dd" });
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const str = String(value).trim();
  if (!str) return null;
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function matchFromList(value, list) {
  const str = String(value || "").trim();
  if (!str) return null;
  return list.find((item) => item.toLowerCase() === str.toLowerCase()) || null;
}

function cell(row, key) {
  const v = row[key];
  return typeof v === "string" ? v.trim() : v;
}

// Validates rows sequentially so a second (or third...) row for a brand
// new product — introduced earlier in the SAME file — only needs its
// batch columns, matching how a real distributor would fill this in
// (list every batch, only describe the product once).
export function validateRows(rawRows, existingProducts) {
  const knownNames = new Set(existingProducts.map((p) => p.name.trim().toLowerCase()));

  return rawRows.map((row, index) => {
    const errors = [];
    const rowNumber = index + 2; // header is row 1 in the spreadsheet
    const name = String(cell(row, "Product Name") || "").trim();
    if (!name) errors.push("Product Name is required");

    const nameKey = name.toLowerCase();
    const isNewProduct = Boolean(name) && !knownNames.has(nameKey);

    const batchNo = String(cell(row, "Batch Number") || "").trim();
    if (!batchNo) errors.push("Batch Number is required");

    const qtyRaw = cell(row, "Quantity");
    const qty = Number(qtyRaw);
    if (qtyRaw === "" || qtyRaw === undefined || Number.isNaN(qty) || qty <= 0) {
      errors.push("Quantity must be a positive number");
    }

    const expiryDate = normalizeDate(cell(row, "Expiry Date"));
    if (!expiryDate) errors.push("Expiry Date is missing or not a valid date");

    const mfgDate = normalizeDate(cell(row, "Manufacture Date")) || today();

    let newProductData = null;
    if (isNewProduct) {
      const category = matchFromList(cell(row, "Category"), CATEGORIES);
      if (!category) errors.push(`Category must be one of ${CATEGORIES.join(", ")} (first row for a new product)`);
      const unit = matchFromList(cell(row, "Unit"), UNITS);
      if (!unit) errors.push(`Unit must be one of ${UNITS.join(", ")} (first row for a new product)`);
      const activeIngredient = String(cell(row, "Active Ingredient") || "").trim();
      const packSize = String(cell(row, "Pack Size") || "").trim();
      const manufacturer = String(cell(row, "Manufacturer") || "").trim();
      const reorderLevelRaw = cell(row, "Reorder Level");
      const reorderLevel = Number(reorderLevelRaw);
      NEW_PRODUCT_REQUIRED_COLUMNS.forEach((col) => {
        const val = cell(row, col);
        if (val === "" || val === undefined || val === null) {
          if (col !== "Category" && col !== "Unit") errors.push(`${col} is required (first row for a new product)`);
        }
      });
      if (reorderLevelRaw !== "" && (Number.isNaN(reorderLevel) || reorderLevel <= 0)) {
        errors.push("Reorder Level must be a positive number");
      }
      const priceRaw = cell(row, "Price Per Unit");
      const pricePerUnit = priceRaw === "" || priceRaw === undefined ? undefined : Number(priceRaw);
      if (priceRaw !== "" && priceRaw !== undefined && Number.isNaN(pricePerUnit)) {
        errors.push("Price Per Unit must be a number if provided");
      }

      newProductData = {
        name,
        category: category || "Herbicide",
        activeIngredient,
        formulation: String(cell(row, "Formulation") || "").trim() || "Other",
        unit: unit || "L",
        packSize,
        manufacturer,
        reorderLevel: Number.isNaN(reorderLevel) || reorderLevel <= 0 ? 0 : reorderLevel,
        pricePerUnit,
      };
    }

    const valid = errors.length === 0;
    if (valid && isNewProduct) knownNames.add(nameKey);

    return {
      rowNumber,
      name,
      batchNo,
      qty,
      expiryDate,
      mfgDate,
      isNewProduct,
      newProductData,
      errors,
      valid,
    };
  });
}
