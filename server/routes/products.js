import { Router } from "express";
import crypto from "node:crypto";
import { pool, nextRank } from "../db.js";
import { requireAuth, requirePermission } from "../lib/auth.js";
import { serializeProduct } from "../lib/serialize.js";
import { recordMovement } from "../lib/movements.js";
import { CATEGORY_PREFIX } from "../../src/utils/inventoryHelpers.js";
import { MAX_IMPORT_ROWS, cleanText, findImportRowError, normalizeKey } from "../../src/utils/bulkImportRules.js";

const router = Router();

const BULK_IMPORT_LOCK = 720341;

async function nextProductId(category, client = pool) {
  const prefix = CATEGORY_PREFIX[category] || "GEN";
  const { rows } = await client.query("SELECT id FROM products WHERE id LIKE $1", [`${prefix}-%`]);
  const numbers = rows.map((r) => parseInt(r.id.split("-")[1], 10)).filter((n) => !Number.isNaN(n));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

async function getProductWithBatches(id, client = pool) {
  const { rows: productRows } = await client.query("SELECT * FROM products WHERE id = $1", [id]);
  const row = productRows[0];
  if (!row) return null;
  const { rows: batchRows } = await client.query("SELECT * FROM batches WHERE product_id = $1 ORDER BY id ASC", [id]);
  return serializeProduct(row, batchRows);
}

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { rows: productRows } = await pool.query("SELECT * FROM products ORDER BY created_at DESC");
    const { rows: batchRows } = await pool.query("SELECT * FROM batches ORDER BY id ASC");
    const batchesByProduct = new Map();
    batchRows.forEach((b) => {
      if (!batchesByProduct.has(b.product_id)) batchesByProduct.set(b.product_id, []);
      batchesByProduct.get(b.product_id).push(b);
    });
    const products = productRows.map((row) => serializeProduct(row, batchesByProduct.get(row.id) || []));
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

router.post("/", requirePermission("manageProducts"), async (req, res, next) => {
  try {
    const { product, openingBatch } = req.body || {};
    if (!product?.name?.trim() || !product?.category) {
      return res.status(400).json({ error: "Product name and category are required." });
    }

    const id = await nextProductId(product.category);
    const createdAt = await nextRank();
    await pool.query(
      `INSERT INTO products (id, name, category, active_ingredient, formulation, unit, pack_size, manufacturer, reorder_level, price_per_unit, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        product.name.trim(),
        product.category,
        product.activeIngredient || "",
        product.formulation || "Other",
        product.unit || "L",
        product.packSize || "",
        product.manufacturer || "",
        Number(product.reorderLevel) || 0,
        product.pricePerUnit === undefined || product.pricePerUnit === "" ? null : Number(product.pricePerUnit),
        createdAt,
      ]
    );

    if (openingBatch && openingBatch.qty > 0) {
      await pool.query("INSERT INTO batches (product_id, batch_no, mfg_date, expiry_date, qty) VALUES ($1, $2, $3, $4, $5)", [
        id,
        openingBatch.batchNo,
        openingBatch.mfgDate,
        openingBatch.expiryDate,
        openingBatch.qty,
      ]);
      await recordMovement({
        productId: id,
        productName: product.name.trim(),
        batchNo: openingBatch.batchNo,
        type: "IN",
        qty: openingBatch.qty,
        unit: product.unit,
        note: "Opening stock — product created",
        performedBy: req.user.name,
      });
    }

    res.status(201).json({ product: await getProductWithBatches(id) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requirePermission("manageProducts"), async (req, res, next) => {
  try {
    const { rows: existingRows } = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: "Product not found." });
    const u = req.body?.updates || {};

    await pool.query(
      `UPDATE products SET name=$1, category=$2, active_ingredient=$3, formulation=$4, unit=$5, pack_size=$6, manufacturer=$7, reorder_level=$8, price_per_unit=$9 WHERE id=$10`,
      [
        u.name ?? existing.name,
        u.category ?? existing.category,
        u.activeIngredient ?? existing.active_ingredient,
        u.formulation ?? existing.formulation,
        u.unit ?? existing.unit,
        u.packSize ?? existing.pack_size,
        u.manufacturer ?? existing.manufacturer,
        u.reorderLevel !== undefined ? Number(u.reorderLevel) : existing.reorder_level,
        u.pricePerUnit === undefined ? existing.price_per_unit : u.pricePerUnit === "" ? null : Number(u.pricePerUnit),
        existing.id,
      ]
    );
    res.json({ product: await getProductWithBatches(existing.id) });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requirePermission("manageProducts"), async (req, res, next) => {
  try {
    const { rows: existingRows } = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    if (!existingRows[0]) return res.status(404).json({ error: "Product not found." });
    await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]); // batches cascade; movement history is kept
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/stock-in", requirePermission("stockMovement"), async (req, res, next) => {
  try {
    const { rows: productRows } = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    const product = productRows[0];
    if (!product) return res.status(404).json({ error: "Product not found." });
    const { batchNo, mfgDate, expiryDate, qty, note } = req.body || {};
    if (!batchNo || !expiryDate || !(qty > 0)) {
      return res.status(400).json({ error: "Batch number, expiry date and a positive quantity are required." });
    }

    const { rows: batchRows } = await pool.query("SELECT * FROM batches WHERE product_id = $1 AND batch_no = $2", [product.id, batchNo]);
    const existingBatch = batchRows[0];
    if (existingBatch) {
      // adjusted in place so a concurrent upload or stock-out isn't overwritten
      await pool.query("UPDATE batches SET qty = qty + $1 WHERE id = $2", [qty, existingBatch.id]);
    } else {
      await pool.query("INSERT INTO batches (product_id, batch_no, mfg_date, expiry_date, qty) VALUES ($1, $2, $3, $4, $5)", [
        product.id,
        batchNo,
        mfgDate,
        expiryDate,
        qty,
      ]);
    }
    await recordMovement({
      productId: product.id,
      productName: product.name,
      batchNo,
      type: "IN",
      qty,
      unit: product.unit,
      note,
      performedBy: req.user.name,
    });
    res.json({ product: await getProductWithBatches(product.id) });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/stock-out", requirePermission("stockMovement"), async (req, res, next) => {
  try {
    const { rows: productRows } = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    const product = productRows[0];
    if (!product) return res.status(404).json({ error: "Product not found." });
    const { batchNo, qty, note } = req.body || {};
    const { rows: batchRows } = await pool.query("SELECT * FROM batches WHERE product_id = $1 AND batch_no = $2", [product.id, batchNo]);
    const batch = batchRows[0];
    if (!batch) return res.status(404).json({ error: "That batch no longer exists — someone may have already changed it." });
    if (!(qty > 0) || qty > batch.qty) {
      return res.status(400).json({ error: `Quantity must be between 1 and ${batch.qty} ${product.unit}.` });
    }

    // adjusted in place so a concurrent upload or stock-out isn't overwritten
    const { rows: updatedRows } = await pool.query("UPDATE batches SET qty = qty - $1 WHERE id = $2 AND qty >= $1 RETURNING qty", [qty, batch.id]);
    if (!updatedRows[0]) return res.status(409).json({ error: "That batch just changed — check the quantity and try again." });
    await pool.query("DELETE FROM batches WHERE id = $1 AND qty <= 0", [batch.id]);

    await recordMovement({
      productId: product.id,
      productName: product.name,
      batchNo,
      type: "OUT",
      qty,
      unit: product.unit,
      note,
      performedBy: req.user.name,
    });
    res.json({ product: await getProductWithBatches(product.id) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/batches/:batchNo", requirePermission("manageBatches"), async (req, res, next) => {
  try {
    const { rows: productRows } = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    const product = productRows[0];
    if (!product) return res.status(404).json({ error: "Product not found." });
    const { rows: beforeRows } = await pool.query("SELECT * FROM batches WHERE product_id = $1 AND batch_no = $2", [
      product.id,
      req.params.batchNo,
    ]);
    const before = beforeRows[0];
    if (!before) return res.status(404).json({ error: "Batch not found." });

    const { batchNo, mfgDate, expiryDate, qty } = req.body || {};
    if (!batchNo || !expiryDate || qty === undefined || qty < 0) {
      return res.status(400).json({ error: "Batch number, expiry date and a quantity are required." });
    }
    if (batchNo !== before.batch_no) {
      const { rows: clashRows } = await pool.query("SELECT * FROM batches WHERE product_id = $1 AND batch_no = $2", [product.id, batchNo]);
      if (clashRows[0]) {
        return res.status(409).json({ error: "This product already has a batch with that number." });
      }
    }

    await pool.query("UPDATE batches SET batch_no=$1, mfg_date=$2, expiry_date=$3, qty=$4 WHERE id=$5", [
      batchNo,
      mfgDate || null,
      expiryDate,
      qty,
      before.id,
    ]);

    const delta = qty - before.qty;
    if (delta !== 0) {
      await recordMovement({
        productId: product.id,
        productName: product.name,
        batchNo,
        type: "ADJUST",
        qty: delta,
        unit: product.unit,
        note: "Batch details corrected",
        performedBy: req.user.name,
      });
    }
    res.json({ product: await getProductWithBatches(product.id) });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/batches/:batchNo", requirePermission("manageBatches"), async (req, res, next) => {
  try {
    const { rows: productRows } = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    const product = productRows[0];
    if (!product) return res.status(404).json({ error: "Product not found." });
    const { rows: batchRows } = await pool.query("SELECT * FROM batches WHERE product_id = $1 AND batch_no = $2", [
      product.id,
      req.params.batchNo,
    ]);
    const batch = batchRows[0];
    if (!batch) return res.status(404).json({ error: "Batch not found." });

    await pool.query("DELETE FROM batches WHERE id = $1", [batch.id]);
    await recordMovement({
      productId: product.id,
      productName: product.name,
      batchNo: batch.batch_no,
      type: "REMOVE",
      qty: batch.qty,
      unit: product.unit,
      note: "Batch removed / written off",
      performedBy: req.user.name,
    });
    res.json({ product: await getProductWithBatches(product.id) });
  } catch (err) {
    next(err);
  }
});

// Thrown inside the import transaction to roll everything back and report
// the row to the user: an upload is saved completely or not at all.
class ImportRejected extends Error {
  constructor(status, message, reason) {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

function importFingerprint(rows) {
  const canonical = rows.map((r) => [normalizeKey(r.name), normalizeKey(r.batchNo), r.qty, r.expiryDate]);
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

// Sums like 0.1 + 0.2 shouldn't leave 0.30000000000000004 on a stock count.
function roundQty(qty) {
  return Math.round(qty * 1e6) / 1e6;
}

async function reserveRanks(client, count) {
  if (count === 0) return [];
  const { rows } = await client.query("SELECT nextval('rank_seq') AS v FROM generate_series(1, $1::int)", [count]);
  return rows.map((r) => Number(r.v));
}

// Works out every change in memory and then writes each table in one
// statement, so a large upload costs a handful of database round trips
// rather than several per row.
async function applyImport(client, rows, { fileName, performedBy }) {
  const { rows: productRows } = await client.query("SELECT * FROM products");
  const productsByName = new Map();
  const nextIdNumbers = new Map();
  productRows.forEach((p) => {
    const key = normalizeKey(p.name);
    productsByName.set(key, productsByName.has(key) ? null : p); // null marks a duplicate name
    const [prefix, number] = p.id.split("-");
    const parsed = parseInt(number, 10);
    if (!Number.isNaN(parsed)) nextIdNumbers.set(prefix, Math.max(nextIdNumbers.get(prefix) || 0, parsed));
  });

  // locked so a concurrent stock-out or batch removal can't interleave with this
  const { rows: batchRows } = await client.query("SELECT * FROM batches FOR UPDATE");
  const batches = new Map(batchRows.map((b) => [`${b.product_id}\0${normalizeKey(b.batch_no)}`, b]));

  const label = fileName || "upload";
  const newProductKeys = new Set(rows.filter((r) => r.newProductData && !productsByName.has(normalizeKey(r.name))).map((r) => normalizeKey(r.name)));
  const ranks = await reserveRanks(client, newProductKeys.size);

  const newProducts = [];
  const newBatches = new Map();
  const batchIncrements = new Map();
  const movements = [];
  const now = new Date().toISOString();
  let restocked = 0;

  rows.forEach((row) => {
    const nameKey = normalizeKey(row.name);
    const batchNo = cleanText(row.batchNo);
    let product = productsByName.get(nameKey);
    if (product === null) {
      throw new ImportRejected(409, `Row ${row.rowNumber}: more than one product is named "${cleanText(row.name)}". Rename them first — nothing was imported.`);
    }

    let isNew = false;
    if (!product) {
      const details = row.newProductData;
      if (!details) {
        throw new ImportRejected(409, `Row ${row.rowNumber}: "${cleanText(row.name)}" no longer exists — it may have just been deleted. Upload the file again — nothing was imported.`);
      }
      const prefix = CATEGORY_PREFIX[cleanText(details.category)] || "GEN";
      const number = (nextIdNumbers.get(prefix) || 0) + 1;
      nextIdNumbers.set(prefix, number);
      product = {
        id: `${prefix}-${String(number).padStart(3, "0")}`,
        name: cleanText(details.name || row.name),
        category: cleanText(details.category),
        active_ingredient: cleanText(details.activeIngredient),
        formulation: cleanText(details.formulation) || "Other",
        unit: cleanText(details.unit),
        pack_size: cleanText(details.packSize),
        manufacturer: cleanText(details.manufacturer),
        reorder_level: details.reorderLevel,
        price_per_unit: details.pricePerUnit ?? null,
        created_at: ranks[ranks.length - 1 - newProducts.length], // first row in the file lists first
      };
      newProducts.push(product);
      productsByName.set(nameKey, product);
      isNew = true;
    }

    const batchKey = `${product.id}\0${normalizeKey(batchNo)}`;
    const existingBatch = batches.get(batchKey);
    const pendingBatch = newBatches.get(batchKey);
    const known = existingBatch || pendingBatch;
    if (known && known.expiry_date !== row.expiryDate) {
      throw new ImportRejected(409, `Row ${row.rowNumber}: batch ${batchNo} already has expiry date ${known.expiry_date}, not ${row.expiryDate}. Nothing was imported.`);
    }
    if (existingBatch) {
      batchIncrements.set(existingBatch.id, (batchIncrements.get(existingBatch.id) || 0) + row.qty);
    } else if (pendingBatch) {
      pendingBatch.qty = roundQty(pendingBatch.qty + row.qty);
    } else {
      newBatches.set(batchKey, { product_id: product.id, batch_no: batchNo, mfg_date: row.mfgDate ?? null, expiry_date: row.expiryDate, qty: row.qty });
    }

    if (!newProducts.includes(product)) restocked += 1;
    // no stock moved, so nothing for the audit trail (same as a product created with no opening stock)
    if (row.qty === 0) return;
    movements.push({
      id: `MV-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      product_id: product.id,
      product_name: product.name,
      batch_no: known?.batch_no || batchNo,
      qty: row.qty,
      unit: product.unit,
      note: `Bulk import (${label})${isNew ? " — new product" : ""}`,
    });
  });

  if (newProducts.length) {
    const col = (key) => newProducts.map((p) => p[key]);
    await client.query(
      `INSERT INTO products (id, name, category, active_ingredient, formulation, unit, pack_size, manufacturer, reorder_level, price_per_unit, created_at)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::float8[], $10::float8[], $11::bigint[])`,
      [col("id"), col("name"), col("category"), col("active_ingredient"), col("formulation"), col("unit"), col("pack_size"), col("manufacturer"), col("reorder_level"), col("price_per_unit"), col("created_at")]
    );
  }
  if (batchIncrements.size) {
    await client.query(
      `UPDATE batches b SET qty = round((b.qty + v.delta)::numeric, 6)::float8
       FROM unnest($1::int[], $2::float8[]) AS v(id, delta) WHERE b.id = v.id`,
      [[...batchIncrements.keys()], [...batchIncrements.values()]]
    );
  }
  if (newBatches.size) {
    const list = [...newBatches.values()];
    const col = (key) => list.map((b) => b[key]);
    await client.query(
      `INSERT INTO batches (product_id, batch_no, mfg_date, expiry_date, qty)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::float8[])`,
      [col("product_id"), col("batch_no"), col("mfg_date"), col("expiry_date"), col("qty")]
    );
  }
  const col = (key) => movements.map((m) => m[key]);
  await client.query(
    `INSERT INTO movements (id, product_id, product_name, batch_no, type, qty, unit, date, note, performed_by)
     SELECT id, product_id, product_name, batch_no, 'IN', qty, unit, $8, note, $9
     FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::float8[], $6::text[], $7::text[])
       AS m(id, product_id, product_name, batch_no, qty, unit, note)`,
    [col("id"), col("product_id"), col("product_name"), col("batch_no"), col("qty"), col("unit"), col("note"), now, performedBy]
  );

  return { created: newProducts.length, restocked, total: rows.length };
}

router.post("/bulk-import", requirePermission("manageProducts"), async (req, res, next) => {
  const { rows, fileName, confirmDuplicate } = req.body || {};
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "No rows to import." });
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return res.status(400).json({ error: `An upload can have at most ${MAX_IMPORT_ROWS} rows.` });
  }
  for (let i = 0; i < rows.length; i += 1) {
    const problem = findImportRowError(rows[i]);
    if (problem) {
      return res.status(400).json({ error: `Row ${rows[i]?.rowNumber ?? i + 2}: ${problem}. Nothing was imported.` });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // one import at a time: keeps generated product IDs and batch totals correct
    await client.query("SELECT pg_advisory_xact_lock($1)", [BULK_IMPORT_LOCK]);

    const fingerprint = importFingerprint(rows);
    const { rows: previous } = await client.query("SELECT * FROM bulk_imports WHERE fingerprint = $1", [fingerprint]);
    if (previous[0] && !confirmDuplicate && rows.some((r) => r.qty > 0)) {
      const when = new Date(previous[0].imported_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
      throw new ImportRejected(
        409,
        `These same rows were already imported by ${previous[0].imported_by} on ${when} UTC. Importing again would add the stock a second time.`,
        "duplicate-import"
      );
    }

    const result = await applyImport(client, rows, { fileName, performedBy: req.user.name });

    await client.query(
      `INSERT INTO bulk_imports (fingerprint, file_name, row_count, imported_by, imported_at) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (fingerprint) DO UPDATE SET file_name = $2, imported_by = $4, imported_at = $5`,
      [fingerprint, fileName || "", rows.length, req.user.name, new Date().toISOString()]
    );
    await client.query("COMMIT");
    res.json(result);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof ImportRejected) return res.status(err.status).json({ error: err.message, reason: err.reason });
    next(err);
  } finally {
    client.release();
  }
});

export default router;
