// Pure rules for bulk stock upload, shared by the browser (preview) and the
// server (final check inside the import transaction). No spreadsheet library
// or browser API in here, so server/routes/products.js can import it directly.
import { CATEGORIES, UNITS, today, formatDate } from "./inventoryHelpers.js";

export const MAX_IMPORT_ROWS = 5000;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

const REQUIRED_DETAIL_COLUMNS = ["Active Ingredient", "Pack Size", "Manufacturer", "Reorder Level"];

export function cleanText(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

// How names and batch numbers are compared: "BioGrow  20sl " is "BioGrow 20SL".
export function normalizeKey(value) {
  return cleanText(value).toLowerCase();
}

// Also folds a plural, so "Herbicides" and "Bags" land on the existing option.
function optionKey(value) {
  return normalizeKey(value).replace(/s$/, "");
}

function isBlank(value) {
  return cleanText(value) === "";
}

function toIsoDate(year, month, day) {
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  // rejects roll-overs such as 31 Feb becoming 3 Mar
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function fullYear(text) {
  return text.length === 2 ? 2000 + Number(text) : Number(text);
}

function monthFromName(text) {
  return MONTHS.indexOf(text.slice(0, 3).toLowerCase()) + 1;
}

function fromExcelSerial(serial) {
  const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

// Returns YYYY-MM-DD, or null if the value isn't certainly a date. Never uses
// `new Date(text)`: it reads 03/04/2026 as US-style March 4 and shifts some
// text dates by the browser's timezone. Numeric dates are day-first.
export function parseDateValue(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    // spreadsheet dates can land a few ms before midnight through float rounding
    const date = new Date(value.getTime() + 1000);
    return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  if (typeof value === "number") return fromExcelSerial(value);

  const text = cleanText(value).replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
  let m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/);
  if (m) return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})(?: .*)?$/);
  if (m) return toIsoDate(fullYear(m[3]), Number(m[2]), Number(m[1]));
  m = text.match(/^(\d{1,2})[-/. ]([a-z]{3,9})\.?[-/., ]+(\d{4}|\d{2})$/i);
  if (m) return toIsoDate(fullYear(m[3]), monthFromName(m[2]), Number(m[1]));
  m = text.match(/^([a-z]{3,9})\.?[-/. ](\d{1,2})[-/., ]+(\d{4}|\d{2})$/i);
  if (m) return toIsoDate(fullYear(m[3]), monthFromName(m[1]), Number(m[2]));
  m = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  if (/^\d{5}(\.\d+)?$/.test(text)) return fromExcelSerial(Number(text));
  return null;
}

// Returns a finite number or NaN. Stricter than Number(), which accepts
// "Infinity" and "0x10". "1,000" is a thousand; "1,5" is rejected as ambiguous.
export function parseNumberValue(value, { allowCurrency = false } = {}) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value !== "string") return NaN;
  let text = value.replace(/\s+/g, "");
  if (allowCurrency) text = text.replace(/^(?:[$€£]|ksh?s?\.?|kes|usd)/i, "");
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) text = text.replace(/,/g, "");
  return /^-?(\d+(\.\d+)?|\.\d+)$/.test(text) ? Number(text) : NaN;
}

function detailValues(product) {
  return {
    Category: product.category,
    "Active Ingredient": product.activeIngredient,
    Formulation: product.formulation,
    Unit: product.unit,
    "Pack Size": product.packSize,
    Manufacturer: product.manufacturer,
    "Reorder Level": product.reorderLevel,
    "Price Per Unit": product.pricePerUnit,
  };
}

function ignoredDetailColumns(row, product) {
  const current = detailValues(product);
  return Object.keys(current).filter((col) => {
    if (isBlank(row[col])) return false;
    if (col === "Reorder Level" || col === "Price Per Unit") {
      return parseNumberValue(row[col], { allowCurrency: true }) !== current[col];
    }
    if (col === "Category" || col === "Unit") return optionKey(row[col]) !== optionKey(current[col]);
    return normalizeKey(row[col]) !== normalizeKey(current[col]);
  });
}

function buildOptionLookup(values) {
  const lookup = new Map();
  values.filter(Boolean).forEach((v) => {
    if (!lookup.has(optionKey(v))) lookup.set(optionKey(v), v);
  });
  return lookup;
}

function canonicalOption(lookup, value) {
  const text = cleanText(value);
  if (!text) return "";
  if (!lookup.has(optionKey(text))) lookup.set(optionKey(text), text);
  return lookup.get(optionKey(text));
}

function readNewProduct(row, name, categories, units, errors) {
  if (isBlank(row.Category)) errors.push("Category is required (first row for a new product)");
  if (isBlank(row.Unit)) errors.push("Unit is required (first row for a new product)");
  REQUIRED_DETAIL_COLUMNS.forEach((col) => {
    if (isBlank(row[col])) errors.push(`${col} is required (first row for a new product)`);
  });

  const reorderLevel = isBlank(row["Reorder Level"]) ? 0 : parseNumberValue(row["Reorder Level"]);
  if (Number.isNaN(reorderLevel) || reorderLevel < 0) errors.push("Reorder Level must be 0 or more");

  const pricePerUnit = isBlank(row["Price Per Unit"])
    ? undefined
    : parseNumberValue(row["Price Per Unit"], { allowCurrency: true });
  if (pricePerUnit !== undefined && (Number.isNaN(pricePerUnit) || pricePerUnit < 0)) {
    errors.push("Price Per Unit must be 0 or more if provided");
  }

  return {
    name,
    category: canonicalOption(categories, row.Category),
    activeIngredient: cleanText(row["Active Ingredient"]),
    formulation: cleanText(row.Formulation) || "Other",
    unit: canonicalOption(units, row.Unit),
    packSize: cleanText(row["Pack Size"]),
    manufacturer: cleanText(row.Manufacturer),
    reorderLevel,
    pricePerUnit,
  };
}

// Validates rows in order, so a later row for a product introduced earlier in
// the SAME file only needs its batch columns (list every batch, describe the
// product once). Numeric cells should arrive unformatted — see parseWorkbookFile.
export function validateRows(rawRows, existingProducts) {
  const known = new Map();
  existingProducts.forEach((p) => {
    const key = normalizeKey(p.name);
    if (!known.has(key)) known.set(key, { product: p, count: 0, batches: new Map() });
    const entry = known.get(key);
    entry.count += 1;
    p.batches.forEach((b) => {
      entry.batches.set(normalizeKey(b.batchNo), { batchNo: b.batchNo, expiryDate: b.expiryDate, qty: b.qty, rowNumber: null });
    });
  });
  const categories = buildOptionLookup([...CATEGORIES, ...existingProducts.map((p) => p.category)]);
  const units = buildOptionLookup([...UNITS, ...existingProducts.map((p) => p.unit)]);
  const failedNewProducts = new Map();

  return rawRows.map((row, index) => {
    const errors = [];
    const warnings = [];
    const rowNumber = row.rowNumber ?? index + 2; // header is row 1 in the spreadsheet
    const typedName = cleanText(row["Product Name"]);
    if (!typedName) errors.push("Product Name is required");
    const nameKey = normalizeKey(typedName);

    const typedBatchNo = cleanText(row["Batch Number"]);
    if (!typedBatchNo) errors.push("Batch Number is required");

    const qty = isBlank(row.Quantity) ? NaN : parseNumberValue(row.Quantity);
    if (isBlank(row.Quantity)) errors.push("Quantity is required — enter 0 if there's no stock");
    else if (Number.isNaN(qty) || qty < 0) errors.push("Quantity must be 0 or more");

    let expiryDate = null;
    if (isBlank(row["Expiry Date"])) {
      errors.push("Expiry Date is required");
    } else {
      expiryDate = parseDateValue(row["Expiry Date"]);
      if (!expiryDate) errors.push(`Expiry Date "${cleanText(row["Expiry Date"])}" isn't a valid date — use day/month/year or YYYY-MM-DD`);
    }

    // optional: blank stays blank, and anything unreadable is left blank with a warning
    let mfgDate = null;
    if (!isBlank(row["Manufacture Date"])) {
      mfgDate = parseDateValue(row["Manufacture Date"]);
      if (!mfgDate) warnings.push(`Manufacture Date "${cleanText(row["Manufacture Date"])}" isn't a date, so it will be left blank`);
    }
    if (mfgDate && expiryDate && mfgDate > expiryDate) errors.push("Manufacture Date is after the Expiry Date");
    if (expiryDate && expiryDate < today()) warnings.push(`This batch already expired on ${formatDate(expiryDate)}`);

    let entry = typedName ? known.get(nameKey) : null;
    const isNewProduct = Boolean(typedName) && !entry;
    let newProductData = null;

    if (isNewProduct && failedNewProducts.has(nameKey) && isBlank(row.Category)) {
      errors.push(`This product's details are on row ${failedNewProducts.get(nameKey)}, which has errors — fix that row first`);
    } else if (isNewProduct) {
      const before = errors.length;
      const detailErrors = [];
      newProductData = readNewProduct(row, typedName, categories, units, detailErrors);
      errors.push(...detailErrors);
      if (errors.length - before === 0) {
        entry = { product: newProductData, count: 1, batches: new Map() };
        known.set(nameKey, entry);
      } else {
        failedNewProducts.set(nameKey, rowNumber);
      }
    } else if (entry) {
      if (entry.count > 1) errors.push(`${entry.count} products are named "${entry.product.name}" — rename them so stock goes to the right one`);
      const ignored = ignoredDetailColumns(row, entry.product);
      if (ignored.length) warnings.push(`Product already defined, so these columns won't change it: ${ignored.join(", ")}`);
    }

    const unit = entry?.product.unit || "";
    const batch = entry && typedBatchNo ? entry.batches.get(normalizeKey(typedBatchNo)) : null;
    if (batch && expiryDate && batch.expiryDate !== expiryDate) {
      const where = batch.rowNumber ? `row ${batch.rowNumber}` : "your stock";
      errors.push(`Batch ${batch.batchNo} expires ${formatDate(batch.expiryDate)} on ${where}, but ${formatDate(expiryDate)} here — one batch can only have one expiry date`);
    }

    const valid = errors.length === 0;
    if (valid && batch && qty === 0) {
      warnings.push(`Batch ${batch.batchNo} already exists — a quantity of 0 won't change it`);
    } else if (valid && batch) {
      const source = batch.rowNumber ? `also on row ${batch.rowNumber}` : "already in stock";
      warnings.push(`Batch ${batch.batchNo} is ${source} (${batch.qty} ${unit}) — this adds ${qty}, making ${batch.qty + qty} ${unit}`);
      batch.qty += qty;
    } else if (valid && entry) {
      entry.batches.set(normalizeKey(typedBatchNo), { batchNo: typedBatchNo, expiryDate, qty, rowNumber });
    }

    return {
      rowNumber,
      name: entry?.product.name || typedName,
      batchNo: batch?.batchNo || typedBatchNo,
      qty,
      unit,
      expiryDate,
      mfgDate,
      isNewProduct,
      newProductData,
      errors,
      warnings,
      valid,
    };
  });
}

// Only what the server needs, which keeps large uploads small.
export function toImportPayloadRows(rows) {
  return rows.map(({ rowNumber, name, batchNo, qty, expiryDate, mfgDate, newProductData }) => ({
    rowNumber,
    name,
    batchNo,
    qty,
    expiryDate,
    mfgDate,
    newProductData,
  }));
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && parseDateValue(value) === value;
}

// The server's own check of a row: the browser's preview can't be trusted.
export function findImportRowError(row) {
  if (!row || typeof row !== "object") return "row is malformed";
  if (typeof row.name !== "string" || !cleanText(row.name)) return "Product Name is required";
  if (typeof row.batchNo !== "string" || !cleanText(row.batchNo)) return "Batch Number is required";
  if (typeof row.qty !== "number" || !Number.isFinite(row.qty) || row.qty < 0) return "Quantity must be 0 or more";
  if (!isIsoDate(row.expiryDate)) return "Expiry Date must be a valid date";
  if (row.mfgDate !== null && row.mfgDate !== undefined && !isIsoDate(row.mfgDate)) return "Manufacture Date must be a valid date";
  if (row.newProductData) {
    const p = row.newProductData;
    if (typeof p.category !== "string" || !cleanText(p.category)) return "Category is required for a new product";
    if (typeof p.unit !== "string" || !cleanText(p.unit)) return "Unit is required for a new product";
    if (typeof p.reorderLevel !== "number" || !(p.reorderLevel >= 0)) return "Reorder Level must be 0 or more";
    if (p.pricePerUnit !== undefined && p.pricePerUnit !== null && (typeof p.pricePerUnit !== "number" || !(p.pricePerUnit >= 0))) {
      return "Price Per Unit must be 0 or more";
    }
  }
  return null;
}
