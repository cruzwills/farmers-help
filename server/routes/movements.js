import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../lib/auth.js";
import { serializeMovement } from "../lib/serialize.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM movements ORDER BY date DESC, seq DESC");
    res.json({ movements: rows.map(serializeMovement) });
  } catch (err) {
    next(err);
  }
});

export default router;
