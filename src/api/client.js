// Thin fetch wrapper for the real backend (server/index.js). Every call
// is same-origin (Vite proxies /api to the API server — see
// vite.config.js) so the session cookie just works with no CORS setup.
export async function apiFetch(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty body (e.g. 204) — fine
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.reason = data?.reason;
    throw error;
  }
  return data;
}

export const api = {
  me: () => apiFetch("/auth/me"),
  login: (identifier, password) => apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) }),
  logout: () => apiFetch("/auth/logout", { method: "POST" }),
  invite: (token) => apiFetch(`/auth/invite/${token}`),
  activate: (token, password) => apiFetch("/auth/activate", { method: "POST", body: JSON.stringify({ token, password }) }),

  products: () => apiFetch("/products"),
  addProduct: (payload) => apiFetch("/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id, updates) => apiFetch(`/products/${id}`, { method: "PATCH", body: JSON.stringify({ updates }) }),
  deleteProduct: (id) => apiFetch(`/products/${id}`, { method: "DELETE" }),
  stockIn: (id, payload) => apiFetch(`/products/${id}/stock-in`, { method: "POST", body: JSON.stringify(payload) }),
  stockOut: (id, payload) => apiFetch(`/products/${id}/stock-out`, { method: "POST", body: JSON.stringify(payload) }),
  updateBatch: (id, batchNo, batch) =>
    apiFetch(`/products/${id}/batches/${encodeURIComponent(batchNo)}`, { method: "PATCH", body: JSON.stringify(batch) }),
  deleteBatch: (id, batchNo) => apiFetch(`/products/${id}/batches/${encodeURIComponent(batchNo)}`, { method: "DELETE" }),
  bulkImport: (payload) => apiFetch("/products/bulk-import", { method: "POST", body: JSON.stringify(payload) }),

  movements: () => apiFetch("/movements"),

  users: () => apiFetch("/users"),
  outbox: () => apiFetch("/users/outbox"),
  addUser: (payload) => apiFetch("/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id, updates) => apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
  deleteUser: (id) => apiFetch(`/users/${id}`, { method: "DELETE" }),
  resendInvite: (id) => apiFetch(`/users/${id}/resend-invite`, { method: "POST" }),
};
