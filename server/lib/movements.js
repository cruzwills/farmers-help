import crypto from "node:crypto";
import { pool } from "../db.js";

export async function recordMovement(
  { productId, productName, batchNo, type, qty, unit, note, performedBy },
  client = pool
) {
  const id = `MV-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  await client.query(
    `INSERT INTO movements (id, product_id, product_name, batch_no, type, qty, unit, date, note, performed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      productId ?? null,
      productName,
      batchNo ?? null,
      type,
      qty,
      unit ?? null,
      new Date().toISOString(),
      note || "",
      performedBy || "Unknown user",
    ]
  );
  return id;
}
