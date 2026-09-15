import { Router } from "express";
import { pool, nextRank } from "../db.js";
import { requireAuth, requirePermission } from "../lib/auth.js";
import { serializeProduct } from "../lib/serialize.js";
import { recordMovement } from "../lib/movements.js";
import { CATEGORY_PREFIX } from "../../src/utils/inventoryHelpers.js";

const router = Router();

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
    const products = await Promise.all(
      productRows.map(async (row) => {
        const { rows: batchRows } = await pool.query("SELECT * FROM batches WHERE product_id = $1 ORDER BY id ASC", [row.id]);
        return serializeProduct(row, batchRows);
      })
    );
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
      await pool.query("UPDATE batches SET qty = $1 WHERE id = $2", [existingBatch.qty + qty, existingBatch.id]);
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

    const remaining = batch.qty - qty;
    if (remaining > 0) await pool.query("UPDATE batches SET qty = $1 WHERE id = $2", [remaining, batch.id]);
    else await pool.query("DELETE FROM batches WHERE id = $1", [batch.id]);

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
      mfgDate,
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

router.post("/bulk-import", requirePermission("manageProducts"), async (req, res, next) => {
  const { rows, fileName } = req.body || {};
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "No rows to import." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // reserve descending ranks up front so the first new-product row in the
    // file ends up on top, matching the order the admin typed them in
    const newRowPositions = rows.map((r, i) => (r.isNewProduct ? i : -1)).filter((i) => i >= 0);
    const ranks = [];
    for (let i = 0; i < newRowPositions.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      ranks.push(await nextRank(client));
    }
    const rankForRowIndex = new Map();
    newRowPositions.forEach((rowIndex, pos) => {
      rankForRowIndex.set(rowIndex, ranks[ranks.length - 1 - pos]);
    });

    let created = 0;
    let restocked = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!row.name || !row.batchNo || !row.expiryDate || !(row.qty > 0)) continue; // defensive skip

      // eslint-disable-next-line no-await-in-loop
      const { rows: existingRows } = await client.query("SELECT * FROM products WHERE lower(name) = lower($1)", [row.name]);
      const existing = existingRows[0];
      if (existing) {
        // eslint-disable-next-line no-await-in-loop
        const { rows: batchRows } = await client.query("SELECT * FROM batches WHERE product_id = $1 AND batch_no = $2", [
          existing.id,
          row.batchNo,
        ]);
        const batch = batchRows[0];
        if (batch) {
          // eslint-disable-next-line no-await-in-loop
          await client.query("UPDATE batches SET qty = $1 WHERE id = $2", [batch.qty + row.qty, batch.id]);
        } else {
          // eslint-disable-next-line no-await-in-loop
          await client.query("INSERT INTO batches (product_id, batch_no, mfg_date, expiry_date, qty) VALUES ($1, $2, $3, $4, $5)", [
            existing.id,
            row.batchNo,
            row.mfgDate,
            row.expiryDate,
            row.qty,
          ]);
        }
        // eslint-disable-next-line no-await-in-loop
        await recordMovement(
          {
            productId: existing.id,
            productName: existing.name,
            batchNo: row.batchNo,
            type: "IN",
            qty: row.qty,
            unit: existing.unit,
            note: `Bulk import (${fileName || "upload"})`,
            performedBy: req.user.name,
          },
          client
        );
        restocked += 1;
      } else if (row.newProductData) {
        // eslint-disable-next-line no-await-in-loop
        const id = await nextProductId(row.newProductData.category, client);
        // eslint-disable-next-line no-await-in-loop
        await client.query(
          `INSERT INTO products (id, name, category, active_ingredient, formulation, unit, pack_size, manufacturer, reorder_level, price_per_unit, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            id,
            row.newProductData.name,
            row.newProductData.category,
            row.newProductData.activeIngredient || "",
            row.newProductData.formulation || "Other",
            row.newProductData.unit || "L",
            row.newProductData.packSize || "",
            row.newProductData.manufacturer || "",
            Number(row.newProductData.reorderLevel) || 0,
            row.newProductData.pricePerUnit === undefined || row.newProductData.pricePerUnit === "" ? null : Number(row.newProductData.pricePerUnit),
            rankForRowIndex.get(index) ?? (await nextRank(client)),
          ]
        );
        // eslint-disable-next-line no-await-in-loop
        await client.query("INSERT INTO batches (product_id, batch_no, mfg_date, expiry_date, qty) VALUES ($1, $2, $3, $4, $5)", [
          id,
          row.batchNo,
          row.mfgDate,
          row.expiryDate,
          row.qty,
        ]);
        // eslint-disable-next-line no-await-in-loop
        await recordMovement(
          {
            productId: id,
            productName: row.newProductData.name,
            batchNo: row.batchNo,
            type: "IN",
            qty: row.qty,
            unit: row.newProductData.unit,
            note: `Bulk import (${fileName || "upload"}) — new product`,
            performedBy: req.user.name,
          },
          client
        );
        created += 1;
      }
    }

    await client.query("COMMIT");
    res.json({ created, restocked, total: created + restocked });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

export default router;
