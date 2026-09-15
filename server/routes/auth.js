import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { serializeUser } from "../lib/serialize.js";

const router = Router();

router.get("/me", (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

router.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ error: "Username or email, and password, are required." });
    }

    const { rows } = await pool.query(
      "SELECT * FROM users WHERE lower(email) = lower($1) OR lower(username) = lower($1)",
      [identifier]
    );
    const row = rows[0];
    if (!row || !row.active) {
      return res.status(401).json({ error: "No account found with that username or email.", reason: "no-account" });
    }
    if (row.status !== "active") {
      return res.status(401).json({
        error: "This account hasn't been activated yet — check your invite email, or ask an Admin to resend it.",
        reason: "not-activated",
      });
    }
    if (!row.password_hash || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: "Incorrect password.", reason: "wrong-password" });
    }

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: "Could not start a session." });
      req.session.userId = row.id;
      res.json({ user: serializeUser(row) });
    });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("farmers_help_sid");
    res.json({ ok: true });
  });
});

router.get("/invite/:token", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE invite_token = $1 AND status = 'invited'", [req.params.token]);
    const row = rows[0];
    if (!row) return res.status(404).json({ error: "This invite link isn't valid." });
    res.json({ name: row.name, role: row.role });
  } catch (err) {
    next(err);
  }
});

router.post("/activate", async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: "A password of at least 8 characters is required." });
    }
    const { rows } = await pool.query("SELECT * FROM users WHERE invite_token = $1 AND status = 'invited'", [token]);
    const row = rows[0];
    if (!row) return res.status(404).json({ error: "This invite link isn't valid." });

    const hash = bcrypt.hashSync(password, 10);
    await pool.query("UPDATE users SET status = 'active', password_hash = $1, invite_token = NULL WHERE id = $2", [hash, row.id]);

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: "Could not start a session." });
      req.session.userId = row.id;
      res.json({ user: serializeUser({ ...row, status: "active" }) });
    });
  } catch (err) {
    next(err);
  }
});

// exported for the users routes, which also need to mint invite tokens
export function generateInviteToken() {
  return crypto.randomBytes(20).toString("hex");
}

export default router;
