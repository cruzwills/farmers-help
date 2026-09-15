export function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    role: row.role,
    active: Boolean(row.active),
    status: row.status,
  };
}

export function serializeBatch(row) {
  return {
    batchNo: row.batch_no,
    mfgDate: row.mfg_date,
    expiryDate: row.expiry_date,
    qty: row.qty,
  };
}

export function serializeProduct(row, batchRows) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    activeIngredient: row.active_ingredient,
    formulation: row.formulation,
    unit: row.unit,
    packSize: row.pack_size,
    manufacturer: row.manufacturer,
    reorderLevel: row.reorder_level,
    pricePerUnit: row.price_per_unit === null ? undefined : row.price_per_unit,
    batches: batchRows.map(serializeBatch),
  };
}

export function serializeMovement(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    batchNo: row.batch_no,
    type: row.type,
    qty: row.qty,
    unit: row.unit,
    date: row.date,
    note: row.note || "",
    performedBy: row.performed_by || "Unknown user",
  };
}

export function serializeOutboxEntry(row) {
  return {
    id: row.id,
    userId: row.user_id,
    to: row.to_email,
    subject: row.subject,
    body: row.body,
    activationPath: row.activation_path,
    sentAt: row.sent_at,
    sent: Boolean(row.sent),
    sendError: row.send_error || null,
  };
}
