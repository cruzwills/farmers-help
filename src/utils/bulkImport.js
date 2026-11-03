import * as XLSX from "xlsx";
import { MAX_IMPORT_ROWS } from "./bulkImportRules.js";

export { validateRows, toImportPayloadRows } from "./bulkImportRules.js";

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

const REQUIRED_COLUMNS = ["Product Name", "Batch Number", "Expiry Date", "Quantity"];
const UNFORMATTED_COLUMNS = ["Reorder Level", "Price Per Unit", "Manufacture Date", "Expiry Date", "Quantity"];
const HEADER_SCAN_ROWS = 25;
const MIN_HEADER_MATCHES = 3;

const COLUMN_ALIASES = {
  productname: "Product Name",
  product: "Product Name",
  name: "Product Name",
  item: "Product Name",
  itemname: "Product Name",
  category: "Category",
  activeingredient: "Active Ingredient",
  ingredient: "Active Ingredient",
  formulation: "Formulation",
  unit: "Unit",
  uom: "Unit",
  unitofmeasure: "Unit",
  unitofmeasurement: "Unit",
  packsize: "Pack Size",
  pack: "Pack Size",
  packaging: "Pack Size",
  manufacturer: "Manufacturer",
  reorderlevel: "Reorder Level",
  reorderpoint: "Reorder Level",
  reorder: "Reorder Level",
  priceperunit: "Price Per Unit",
  unitprice: "Price Per Unit",
  price: "Price Per Unit",
  batchnumber: "Batch Number",
  batchno: "Batch Number",
  batch: "Batch Number",
  lotnumber: "Batch Number",
  lotno: "Batch Number",
  lot: "Batch Number",
  manufacturedate: "Manufacture Date",
  manufacturingdate: "Manufacture Date",
  mfgdate: "Manufacture Date",
  mfg: "Manufacture Date",
  expirydate: "Expiry Date",
  expiry: "Expiry Date",
  expirationdate: "Expiry Date",
  expdate: "Expiry Date",
  exp: "Expiry Date",
  quantity: "Quantity",
  qty: "Quantity",
};

// A problem with the file as a whole; its message is written for the user.
export class BulkFileError extends Error {}

function addDaysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildTemplateWorkbook(products = []) {
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
  ];
  // a restock example only makes sense for a product that actually exists
  if (products[0]) {
    rows.push({
      "Product Name": products[0].name,
      Category: "",
      "Active Ingredient": "",
      Formulation: "",
      Unit: "",
      "Pack Size": "",
      Manufacturer: "",
      "Reorder Level": "",
      "Price Per Unit": "",
      "Batch Number": "RESTOCK-01",
      "Manufacture Date": addDaysFromNow(0),
      "Expiry Date": addDaysFromNow(500),
      Quantity: 25,
    });
  }
  const sheet = XLSX.utils.json_to_sheet(rows, { header: TEMPLATE_COLUMNS });
  sheet["!cols"] = TEMPLATE_COLUMNS.map((c) => ({ wch: Math.max(14, c.length + 2) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Stock Upload");
  return workbook;
}

export function downloadTemplate(products) {
  XLSX.writeFile(buildTemplateWorkbook(products), "farmers-help-stock-upload-template.xlsx");
}

// Finds a "Batch No." or "qty" column as readily as the template's own headers.
function canonicalColumn(header) {
  const key = String(header ?? "")
    .replace(/\(.*?\)/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return COLUMN_ALIASES[key] || null;
}

function mapHeaderRow(cells) {
  const columns = new Map();
  cells.forEach((header, position) => {
    const column = canonicalColumn(header);
    if (column && !columns.has(column)) columns.set(column, position);
  });
  return columns;
}

// A merged cell only stores its value in the top-left corner; copy it across
// so a product name merged over several batch rows applies to each of them.
function unmergeCells(sheet) {
  (sheet["!merges"] || []).forEach((range) => {
    const source = sheet[XLSX.utils.encode_cell(range.s)];
    if (!source) return;
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        sheet[XLSX.utils.encode_cell({ r, c })] = source;
      }
    }
  });
}

function findHeader(rows) {
  let best = null;
  rows.slice(0, HEADER_SCAN_ROWS).forEach((cells, index) => {
    const columns = mapHeaderRow(cells);
    if (columns.size >= MIN_HEADER_MATCHES && (!best || columns.size > best.columns.size)) best = { index, columns };
  });
  return best;
}

// Formatted text keeps identifiers as displayed (batch "00123"), except that
// a long number in a General cell displays as 1.23457E+11.
function textCell(rawValue, shownValue) {
  if (typeof rawValue === "number" && /e\+/i.test(String(shownValue))) return String(rawValue);
  return shownValue;
}

export async function parseWorkbookFile(file) {
  const buffer = await file.arrayBuffer();
  // raw keeps CSV cells as typed: otherwise the library itself reads 03/04/2026
  // as US-style before our day-first date parsing ever sees it
  const isDelimitedText = /\.(csv|txt)$/i.test(file.name || "");
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true, raw: isDelimitedText });

  let foundAnyHeader = false;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) continue;
    unmergeCells(sheet);

    // Values come unformatted: a formatted read turns 1000 into "1,000",
    // rounds 12.5 up to "13" in a whole-number cell, and shifts dates.
    const options = { header: 1, blankrows: true, defval: "" };
    const rawRows = XLSX.utils.sheet_to_json(sheet, { ...options, raw: true, UTC: true });
    const shownRows = XLSX.utils.sheet_to_json(sheet, { ...options, raw: false, dateNF: "yyyy-mm-dd" });
    const header = findHeader(shownRows);
    if (!header) continue;
    foundAnyHeader = true;

    const missing = REQUIRED_COLUMNS.filter((column) => !header.columns.has(column));
    if (missing.length) {
      throw new BulkFileError(`Sheet "${sheetName}" is missing these columns: ${missing.join(", ")}. Download the template to see the expected layout.`);
    }

    const firstRowNumber = XLSX.utils.decode_range(sheet["!ref"]).s.r + 1;
    const rows = [];
    for (let i = header.index + 1; i < rawRows.length; i += 1) {
      const row = { rowNumber: firstRowNumber + i };
      let hasContent = false;
      header.columns.forEach((position, column) => {
        const rawValue = rawRows[i]?.[position] ?? "";
        const shownValue = shownRows[i]?.[position] ?? "";
        row[column] = UNFORMATTED_COLUMNS.includes(column) ? rawValue : textCell(rawValue, shownValue);
        if (String(row[column]).trim() !== "") hasContent = true;
      });
      if (hasContent) rows.push(row);
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BulkFileError(`That file has ${rows.length} rows; the limit is ${MAX_IMPORT_ROWS} per upload. Split it into smaller files.`);
    }
    return rows;
  }

  if (!foundAnyHeader) {
    throw new BulkFileError(`Couldn't find the column headers (such as ${REQUIRED_COLUMNS.join(", ")}). Download the template to see the expected layout.`);
  }
  return [];
}
