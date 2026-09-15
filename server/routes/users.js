import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { requireAuth, requirePermission } from "../lib/auth.js";
import { serializeUser, serializeOutboxEntry } from "../lib/serialize.js";
import { sendRealEmail } from "../lib/email.js";
import { buildInviteEmail } from "../../src/utils/invite.js";

const router = Router();
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5173";

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,30}$/;

function generateInviteToken() {
  return crypto.randomBytes(20).toString("hex");
}

async function sendInviteEmail(user, token) {
  const email = buildInviteEmail({ name: user.name, username: user.username, email: user.email, token, role: user.role });
  const activationUrl = `${APP_BASE_URL}${email.activationPath}`;
  const bodyWithFullLink = email.body.replace(email.activationPath, activationUrl);

  const result = await sendRealEmail({ to: email.to, subject: email.subject, text: bodyWithFullLink });

  const id = `OUT-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  await pool.query(
    `INSERT INTO outbox (id, user_id, to_email, subject, body, activation_path, sent_at, sent, send_error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, user.id, email.to, email.subject, bodyWithFullLink, email.activationPath, new Date().toISOString(), result.sent ? 1 : 0, result.error]
  );
  return { id, ...email, body: bodyWithFullLink, sent: result.sent, sendError: result.error };
}

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users ORDER BY id ASC");
    res.json({ users: rows.map(serializeUser) });
  } catch (err) {
    next(err);
  }
});

router.get("/outbox", requirePermission("manageUsers"), async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM outbox ORDER BY sent_at DESC");
    res.json({ outbox: rows.map(serializeOutboxEntry) });
  } catch (err) {
    next(err);
  }
});

router.post("/", requirePermission("manageUsers"), async (req, res, next) => {
  try {
    const { name, username, email, role, active = true } = req.body || {};
    if (!name?.trim() || !username?.trim() || !email?.trim() || !role) {
      return res.status(400).json({ error: "Name, username, email and role are required." });
    }
    if (!USERNAME_PATTERN.test(username.trim())) {
      return res.status(400).json({ error: "Username must be 3-30 characters: letters, numbers, dots, underscores or hyphens only." });
    }
    const { rows: usernameRows } = await pool.query("SELECT 1 FROM users WHERE lower(username) = lower($1)", [username.trim()]);
    if (usernameRows.length) {
      return res.status(409).json({ error: "Another user already has this username." });
    }
    const { rows: emailRows } = await pool.query("SELECT 1 FROM users WHERE lower(email) = lower($1)", [email]);
    if (emailRows.length) {
      return res.status(409).json({ error: "Another user already has this email." });
    }

    const id = `U${Date.now()}`;
    const token = generateInviteToken();
    await pool.query(
      "INSERT INTO users (id, name, username, email, password_hash, role, active, status, invite_token) VALUES ($1, $2, $3, $4, NULL, $5, $6, 'invited', $7)",
      [id, name.trim(), username.trim(), email.trim(), role, active ? 1 : 0, token]
    );

    const { rows: userRows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = userRows[0];
    const outboxEntry = await sendInviteEmail(user, token);
    res.status(201).json({ user: serializeUser(user), outboxEntry });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requirePermission("manageUsers"), async (req, res, next) => {
  try {
    const { rows: existingRows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: "User not found." });

    const { name, username, email, role, active } = req.body || {};
    if (username && username.toLowerCase() !== (existing.username || "").toLowerCase()) {
      if (!USERNAME_PATTERN.test(username.trim())) {
        return res.status(400).json({ error: "Username must be 3-30 characters: letters, numbers, dots, underscores or hyphens only." });
      }
      const { rows: usernameRows } = await pool.query("SELECT 1 FROM users WHERE lower(username) = lower($1)", [username.trim()]);
      if (usernameRows.length) {
        return res.status(409).json({ error: "Another user already has this username." });
      }
    }
    if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
      const { rows: emailRows } = await pool.query("SELECT 1 FROM users WHERE lower(email) = lower($1)", [email]);
      if (emailRows.length) {
        return res.status(409).json({ error: "Another user already has this email." });
      }
    }

    await pool.query("UPDATE users SET name = $1, username = $2, email = $3, role = $4, active = $5 WHERE id = $6", [
      name?.trim() ?? existing.name,
      username?.trim() ?? existing.username,
      email?.trim() ?? existing.email,
      role ?? existing.role,
      active === undefined ? existing.active : active ? 1 : 0,
      existing.id,
    ]);
    const { rows: updatedRows } = await pool.query("SELECT * FROM users WHERE id = $1", [existing.id]);
    res.json({ user: serializeUser(updatedRows[0]) });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requirePermission("manageUsers"), async (req, res, next) => {
  try {
    const { rows: targetRows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    const target = targetRows[0];
    if (!target) return res.status(404).json({ error: "User not found." });
    if (target.id === req.user.id) {
      return res.status(400).json({ error: "You can't remove your own account while signed in." });
    }
    if (target.role === "Admin") {
      const { rows: countRows } = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'Admin' AND id != $1", [target.id]);
      if (Number(countRows[0].count) === 0) return res.status(400).json({ error: "At least one Admin must remain." });
    }
    await pool.query("DELETE FROM users WHERE id = $1", [target.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/resend-invite", requirePermission("manageUsers"), async (req, res, next) => {
  try {
    const { rows: userRows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    const user = userRows[0];
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.status !== "invited") return res.status(400).json({ error: "This user has already activated their account." });

    const token = generateInviteToken();
    await pool.query("UPDATE users SET invite_token = $1 WHERE id = $2", [token, user.id]);
    const outboxEntry = await sendInviteEmail(user, token);
    res.json({ outboxEntry });
  } catch (err) {
    next(err);
  }
});

export default router;
