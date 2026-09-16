import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import crypto from "node:crypto";
import { pool, ready } from "./db.js";
import { attachUser } from "./lib/auth.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import productRoutes from "./routes/products.js";
import movementRoutes from "./routes/movements.js";

const IS_PRODUCTION = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

const app = express();
const PORT = process.env.PORT || 4000;

// a fresh secret each boot is fine for local dev (sessions just reset on
// restart); set SESSION_SECRET yourself for production so a redeploy or a
// cold start doesn't invalidate everyone's session
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
if (IS_PRODUCTION && !process.env.SESSION_SECRET) {
  console.warn("[server] SESSION_SECRET is not set — every cold start will invalidate existing sessions. Set it in your Vercel project env vars.");
}

const PgSession = connectPgSimple(session);

// Vercel serverless functions have no shared memory between invocations,
// so sessions must live in the database, not express-session's default
// in-memory store (which would forget everyone on every cold start).
app.set("trust proxy", 1);

// Every response here is session-specific — Vercel's CDN otherwise applies
// a default cacheable Cache-Control with no Vary: Cookie, so concurrent
// requests to the same path can be coalesced into one shared response
// regardless of which session's cookie each request actually carried. That
// produced a real bug: a freshly authenticated request could occasionally
// get served someone else's (or an earlier unauthenticated) cached 401.
// no-store opts every API response out of that entirely.
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use(express.json());
app.use(
  session({
    store: new PgSession({ pool, tableName: "session", createTableIfMissing: true }),
    name: "farmers_help_sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: IS_PRODUCTION,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);
app.use(attachUser);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/movements", movementRoutes);

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

// On Vercel, api/index.js imports `app` and `ready()` directly and never
// calls listen() — the platform handles the HTTP server itself. Locally
// (npm run server) this file is the entry point, so it starts listening
// once the database schema/seed check has finished.
if (!process.env.VERCEL) {
  ready()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[server] Farmer's Help API listening on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("[server] Failed to initialize the database:", err);
      process.exit(1);
    });
}

export { app };
