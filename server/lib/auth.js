import { pool } from "../db.js";
import { serializeUser } from "./serialize.js";
import { hasPermission } from "../../src/utils/permissions.js";

export async function loadSessionUser(req) {
  if (!req.session.userId) return null;
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
  const row = rows[0];
  if (!row || !row.active || row.status !== "active") return null;
  return row;
}

// attaches req.user (raw db row) when a valid session exists; does not
// itself reject unauthenticated requests — pair with requireAuth
export async function attachUser(req, _res, next) {
  try {
    req.user = await loadSessionUser(req);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not signed in." });
  next();
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not signed in." });
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: "You don't have permission to do that." });
    }
    next();
  };
}

export { serializeUser };
