/* eslint-env node */
import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { buildTemplateWorkbook, parseWorkbookFile, validateRows } from "../src/utils/bulkImport.js";
import { findImportRowError, parseDateValue, parseNumberValue } from "../src/utils/bulkImportRules.js";

const HEADERS = ["Product Name", "Category", "Active Ingredient", "Formulation", "Unit", "Pack Size", "Manufacturer", "Reorder Level", "Price Per Unit", "Batch Number", "Manufacture Date", "Expiry Date", "Quantity"];
const DETAILS = ["Herbicide", "AI", "SL", "L", "5 L", "Acme", 10, 5];
const FUTURE = "2030-05-04";

async function parseXlsx(aoa, mutate, sheets = []) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach(([name, rows]) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name));
  const sheet = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
  if (mutate) mutate(sheet);
  XLSX.utils.book_append_sheet(workbook, sheet, "Stock");
  return parseWorkbookFile(new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], "stock.xlsx"));
}

const parseCsv = (text) => parseWorkbookFile(new File([text], "stock.csv"));
const csvRow = (name, batch, expiry, qty, mfg = "") => `${name},Herbicide,AI,SL,L,5 L,Acme,10,5,${batch},${mfg},${expiry},${qty}`;

const existing = [
  {
    id: "HRB-001",
    name: "RoundClear 41SL",
    category: "Herbicide",
    activeIngredient: "Glyphosate",
    formulation: "SL",
    unit: "L",
    packSize: "5 L",
    manufacturer: "Acme",
    reorderLevel: 10,
    pricePerUnit: 5,
    batches: [{ batchNo: "RC-1", mfgDate: "2026-01-01", expiryDate: FUTURE, qty: 40 }],
  },
];

const batchRow = (over) => ({ "Product Name": "RoundClear 41SL", "Batch Number": "RC-2", "Expiry Date": FUTURE, Quantity: 5, ...over });
const newRow = (over) => ({
  "Product Name": "New",
  Category: "Herbicide",
  "Active Ingredient": "AI",
  Unit: "L",
  "Pack Size": "5 L",
  Manufacturer: "Acme",
  "Reorder Level": 10,
  "Batch Number": "N-1",
  "Expiry Date": FUTURE,
  Quantity: 5,
  ...over,
});

// What Excel really stores: a whole day number plus a display format.
const serialFor = (iso) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86400000);

for (const tz of ["Africa/Nairobi", "America/New_York", "Pacific/Auckland", "Europe/London", "UTC"]) {
  test(`every Excel date keeps its calendar day in ${tz}`, async () => {
    const previous = process.env.TZ;
    process.env.TZ = tz;
    try {
      const expected = [];
      for (let t = Date.UTC(2027, 0, 1); t < Date.UTC(2031, 0, 1); t += 86400000) expected.push(new Date(t).toISOString().slice(0, 10));
      const raw = await parseXlsx(
        [HEADERS, ...expected.map((iso, i) => [`P${i}`, ...DETAILS, "B", "", serialFor(iso), 4])],
        (ws) => {
          expected.forEach((_, i) => {
            ws[`L${i + 2}`].z = i % 2 ? "dd/mm/yyyy" : "m/d/yy";
          });
        }
      );
      const parsed = validateRows(raw, []).map((r) => r.expiryDate);
      assert.deepEqual(parsed, expected);
    } finally {
      process.env.TZ = previous;
    }
  });
}

test("text dates are day-first and never shift or roll over", () => {
  assert.equal(parseDateValue("03/04/2028"), "2028-04-03");
  assert.equal(parseDateValue("13/05/2028"), "2028-05-13");
  assert.equal(parseDateValue("3-4-28"), "2028-04-03");
  assert.equal(parseDateValue("2028/05/04"), "2028-05-04");
  assert.equal(parseDateValue("2028-05-04 00:00:00"), "2028-05-04");
  assert.equal(parseDateValue("4 Mar 2028"), "2028-03-04");
  assert.equal(parseDateValue("04-Mar-28"), "2028-03-04");
  assert.equal(parseDateValue("March 4th, 2028"), "2028-03-04");
  assert.equal(parseDateValue("20280504"), "2028-05-04");
  assert.equal(parseDateValue("46000"), "2025-12-09");
  assert.equal(parseDateValue(46000), "2025-12-09");
  for (const bad of ["03/25/2028", "31/02/2028", "2028-02-31", "garbage", "03/2028", "1/1/1900", "Foo 4 2028", "123"]) {
    assert.equal(parseDateValue(bad), null, bad);
  }
});

test("numbers are strict", () => {
  assert.equal(parseNumberValue("1,000"), 1000);
  assert.equal(parseNumberValue("1,234,567.5"), 1234567.5);
  assert.equal(parseNumberValue(" 40 "), 40);
  assert.equal(parseNumberValue("$780.00", { allowCurrency: true }), 780);
  assert.equal(parseNumberValue("KSh 1,200", { allowCurrency: true }), 1200);
  for (const bad of ["Infinity", "0x10", "1,5", "abc", "", "1e3", "12 L"]) assert.ok(Number.isNaN(parseNumberValue(bad)), bad);
  assert.ok(Number.isNaN(parseNumberValue(Infinity)));
});

test("cell display formats don't change the stored value", async () => {
  const raw = await parseXlsx(
    [HEADERS, ["P", ...DETAILS.slice(0, 7), 780, 123, "", FUTURE, 12.5], ["Q", ...DETAILS.slice(0, 7), 780, 123456789012, "", FUTURE, 1000]],
    (ws) => {
      ws.M2.z = "0"; // would display 13
      ws.M3.z = "#,##0"; // would display 1,000
      ws.I2.z = '"$"#,##0.00';
      ws.J2.z = "00000";
    }
  );
  const [first, second] = validateRows(raw, []);
  assert.deepEqual(first.errors, []);
  assert.equal(first.qty, 12.5);
  assert.equal(first.newProductData.pricePerUnit, 780);
  assert.equal(first.batchNo, "00123");
  assert.equal(second.qty, 1000);
  assert.equal(second.batchNo, "123456789012");
});

test("CSV: day-first dates, BOM, semicolons, thousands", async () => {
  const [row] = validateRows(await parseCsv(`${HEADERS.join(",")}\n${csvRow("P", "B", "04/05/2030", '"1,000"', "03/04/2026")}`), []);
  assert.deepEqual(row.errors, []);
  assert.equal(row.expiryDate, "2030-05-04");
  assert.equal(row.mfgDate, "2026-04-03");
  assert.equal(row.qty, 1000);

  const semi = await parseCsv(`\uFEFF${HEADERS.join(";")}\nP;Herbicide;AI;SL;L;5 L;Acme;10;5;B;;${FUTURE};4`);
  assert.equal(validateRows(semi, [])[0].valid, true);
  assert.equal(semi[0]["Product Name"], "P");
});

test("flexible headers, title rows, and true spreadsheet row numbers", async () => {
  const raw = await parseCsv(
    ["Farmer's Help stock count,,,", "", "product name,CATEGORY,Active Ingredient,Unit,Pack Size,Manufacturer,Reorder level,Batch No.,Expiry,Qty (L),Notes", `P,Herbicide,AI,L,5 L,Acme,10,B,${FUTURE},4,hello`, ",,,,,,,,,,", "", `Q,,,,,,,,${FUTURE},4,`].join("\n")
  );
  assert.equal(raw.length, 2);
  const [first, second] = validateRows(raw, []);
  assert.equal(first.rowNumber, 4);
  assert.equal(first.valid, true);
  assert.equal(second.rowNumber, 7);
  assert.ok(second.errors.includes("Batch Number is required"));
});

test("file-level problems give a specific message", async () => {
  await assert.rejects(parseCsv("Product Name,Category,Batch Number\nP,H,B"), /missing these columns: Expiry Date, Quantity/);
  await assert.rejects(parseCsv("a,b,c\n1,2,3"), /Couldn't find the column headers/);
  const rows = [HEADERS.join(",")];
  for (let i = 0; i < 5001; i += 1) rows.push(csvRow(`P${i}`, "B", FUTURE, 1));
  await assert.rejects(parseCsv(rows.join("\n")), /limit is 5000/);
  assert.deepEqual(await parseCsv(HEADERS.join(",")), []);
});

test("an instructions sheet before the data is skipped; merged names apply to each row", async () => {
  const raw = await parseXlsx(
    [HEADERS, ["P", ...DETAILS, "B1", "", FUTURE, 4], ["", "", "", "", "", "", "", "", "", "B2", "", FUTURE, 6]],
    (ws) => {
      ws["!merges"] = [{ s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }];
    },
    [["Read me", [["Fill in the next sheet"]]]]
  );
  const rows = validateRows(raw, []);
  assert.deepEqual(rows.map((r) => [r.name, r.batchNo, r.valid, r.isNewProduct]), [["P", "B1", true, true], ["P", "B2", true, false]]);
});

test("category and unit spelling folds onto existing options", () => {
  const rows = validateRows(
    [
      newRow({ "Product Name": "A", Category: "herbicide", Unit: "kg" }),
      newRow({ "Product Name": "B", Category: "HERBICIDES", Unit: "Bags" }),
      newRow({ "Product Name": "C", Category: "seeds", Unit: "pack" }),
      newRow({ "Product Name": "D", Category: "Seeds", Unit: "PACK" }),
    ],
    []
  );
  assert.deepEqual(rows.map((r) => [r.newProductData.category, r.newProductData.unit]), [["Herbicide", "Kg"], ["Herbicide", "Bag"], ["seeds", "pack"], ["seeds", "pack"]]);
});

test("matches existing products and batches despite case and spacing", () => {
  const [row] = validateRows([batchRow({ "Product Name": "  roundclear   41sl", "Batch Number": "rc-1", Quantity: 5 })], existing);
  assert.equal(row.valid, true);
  assert.equal(row.isNewProduct, false);
  assert.equal(row.name, "RoundClear 41SL");
  assert.equal(row.batchNo, "RC-1");
  assert.equal(row.unit, "L");
  assert.match(row.warnings[0], /already in stock \(40 L\).*adds 5, making 45 L/);
});

test("a batch can't get a second expiry date, from stock or within the file", () => {
  const [fromStock] = validateRows([batchRow({ "Batch Number": "RC-1", "Expiry Date": "2031-01-01" })], existing);
  assert.equal(fromStock.valid, false);
  assert.match(fromStock.errors[0], /one batch can only have one expiry date/);

  const rows = validateRows([newRow(), newRow({ Category: "", "Expiry Date": "2031-01-01" })], []);
  assert.equal(rows[1].valid, false);

  const repeat = validateRows([newRow(), newRow({ Quantity: 7 })], []);
  assert.equal(repeat[1].valid, true);
  assert.match(repeat[1].warnings[0], /also on row 2 \(5 L\).*making 12 L/);
});

test("bad rows are reported, not silently repaired", () => {
  const errorsFor = (over) => validateRows([newRow(over)], [])[0].errors.join("|");
  assert.match(errorsFor({ "Manufacture Date": "2031-01-01" }), /after the Expiry Date/);
  assert.match(errorsFor({ "Price Per Unit": -5 }), /Price Per Unit/);
  assert.match(errorsFor({ "Price Per Unit": "abc" }), /Price Per Unit/);
  assert.match(errorsFor({ Quantity: "Infinity" }), /Quantity/);
  assert.match(errorsFor({ Quantity: -1 }), /Quantity must be 0 or more/);
  assert.match(errorsFor({ Quantity: "" }), /Quantity is required/);
  assert.match(errorsFor({ "Reorder Level": "" }), /Reorder Level is required/);
  assert.match(errorsFor({ "Expiry Date": "03/25/2030" }), /isn't a valid date/);
  assert.deepEqual(errorsFor({ "Reorder Level": 0 }), "");
});

test("a quantity of zero is accepted", () => {
  const [fresh] = validateRows([newRow({ Quantity: 0 })], []);
  assert.equal(fresh.valid, true);
  assert.equal(fresh.qty, 0);
  const [same] = validateRows([batchRow({ "Batch Number": "RC-1", Quantity: "0" })], existing);
  assert.equal(same.valid, true);
  assert.match(same.warnings[0], /quantity of 0 won't change it/);
  assert.equal(findImportRowError({ name: "P", batchNo: "B", qty: 0, expiryDate: FUTURE, mfgDate: null, newProductData: null }), null);
});

test("Manufacture Date is optional and never blocks a row", () => {
  const [blank] = validateRows([newRow()], []);
  assert.equal(blank.valid, true);
  assert.equal(blank.mfgDate, null);
  for (const text of ["Farmers help", "31/02/2028"]) {
    const [row] = validateRows([newRow({ "Manufacture Date": text })], []);
    assert.equal(row.valid, true, text);
    assert.equal(row.mfgDate, null);
    assert.match(row.warnings[0], /will be left blank/);
  }
  assert.equal(validateRows([newRow({ "Manufacture Date": "03/04/2026" })], [])[0].mfgDate, "2026-04-03");
});

test("warns about expired stock and ignored product details", () => {
  const [expired] = validateRows([batchRow({ "Expiry Date": "2020-01-01", "Manufacture Date": "2019-01-01" })], existing);
  assert.equal(expired.valid, true);
  assert.match(expired.warnings[0], /already expired/);
  const [changed] = validateRows([batchRow({ Unit: "Kg", "Price Per Unit": 9, Category: "herbicide" })], existing);
  assert.match(changed.warnings[0], /won't change it: Unit, Price Per Unit/);
});

test("rows after a broken new-product row point back to it", () => {
  const rows = validateRows([newRow({ Category: "" }), { "Product Name": "New", "Batch Number": "N-2", "Expiry Date": FUTURE, Quantity: 1 }], []);
  assert.match(rows[1].errors[0], /details are on row 2/);
});

test("duplicate product names in stock block the row instead of guessing", () => {
  const twins = [existing[0], { ...existing[0], id: "HRB-002", batches: [] }];
  assert.match(validateRows([batchRow()], twins)[0].errors[0], /2 products are named/);
});

test("the downloaded template validates cleanly", async () => {
  const buffer = XLSX.write(buildTemplateWorkbook(existing), { type: "array", bookType: "xlsx" });
  const rows = validateRows(await parseWorkbookFile(new File([buffer], "template.xlsx")), existing);
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.valid), JSON.stringify(rows.map((r) => r.errors)));
  assert.deepEqual(rows.map((r) => r.isNewProduct), [true, false, false]);
});

test("the server check rejects what the preview would reject", () => {
  const good = { name: "P", batchNo: "B", qty: 1, expiryDate: FUTURE, mfgDate: null, newProductData: null };
  assert.equal(findImportRowError(good), null);
  assert.ok(findImportRowError({ ...good, qty: "5" }));
  assert.ok(findImportRowError({ ...good, qty: -1 }));
  assert.ok(findImportRowError({ ...good, expiryDate: "2028-02-31" }));
  assert.ok(findImportRowError({ ...good, expiryDate: "04/05/2028" }));
  assert.ok(findImportRowError({ ...good, name: " " }));
  assert.ok(findImportRowError({ ...good, newProductData: { category: "", unit: "L", reorderLevel: 0 } }));
  assert.ok(findImportRowError(null));
});
