import pg from "pg";
import bcrypt from "bcryptjs";
import { seedProducts, seedMovements, seedUsers } from "../src/data/products.js";

const { Pool } = pg;

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "No database configured — set POSTGRES_URL (or DATABASE_URL) to a Postgres connection string. See .env.example."
  );
}

// Vercel/Neon connections need TLS; a local Postgres on localhost doesn't.
const useSsl = !/localhost|127\.0\.0\.1/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'invited',
    invite_token TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    active_ingredient TEXT,
    formulation TEXT,
    unit TEXT NOT NULL,
    pack_size TEXT,
    manufacturer TEXT,
    reorder_level DOUBLE PRECISION NOT NULL DEFAULT 0,
    price_per_unit DOUBLE PRECISION,
    created_at BIGINT NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_no TEXT NOT NULL,
    mfg_date TEXT,
    expiry_date TEXT NOT NULL,
    qty DOUBLE PRECISION NOT NULL
  );

  CREATE TABLE IF NOT EXISTS movements (
    id TEXT PRIMARY KEY,
    seq SERIAL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    batch_no TEXT,
    type TEXT NOT NULL,
    qty DOUBLE PRECISION NOT NULL,
    unit TEXT,
    date TEXT NOT NULL,
    note TEXT,
    performed_by TEXT
  );

  CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    activation_path TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    sent INTEGER NOT NULL DEFAULT 0,
    send_error TEXT
  );

  CREATE SEQUENCE IF NOT EXISTS rank_seq;
`;

async function migrateColumns(client) {
  const { rows: outboxColumns } = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'outbox'"
  );
  const outboxNames = outboxColumns.map((c) => c.column_name);
  if (!outboxNames.includes("sent")) {
    await client.query("ALTER TABLE outbox ADD COLUMN sent INTEGER NOT NULL DEFAULT 0");
  }
  if (!outboxNames.includes("send_error")) {
    await client.query("ALTER TABLE outbox ADD COLUMN send_error TEXT");
  }

  // "username" was added after users could already exist — backfill from
  // the email's local part so nobody is left unable to log in, deduping
  // against a collision (rare, but possible)
  const { rows: userColumns } = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
  );
  const userNames = userColumns.map((c) => c.column_name);
  if (!userNames.includes("username")) {
    await client.query("ALTER TABLE users ADD COLUMN username TEXT");
    const { rows: needing } = await client.query("SELECT id, email FROM users WHERE username IS NULL");
    for (const { id, email } of needing) {
      let candidate = email.split("@")[0].toLowerCase();
      let suffix = 1;
      // eslint-disable-next-line no-await-in-loop
      while ((await client.query("SELECT 1 FROM users WHERE lower(username) = lower($1)", [candidate])).rowCount > 0) {
        candidate = `${email.split("@")[0].toLowerCase()}${suffix}`;
        suffix += 1;
      }
      // eslint-disable-next-line no-await-in-loop
      await client.query("UPDATE users SET username = $1 WHERE id = $2", [candidate, id]);
    }
    await client.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)");
  }
}

// products.created_at doubles as a display-order rank (sorted DESC), not a
// literal timestamp. A Postgres sequence guarantees distinct, monotonic
// values even across concurrent serverless invocations (an in-memory JS
// counter isn't safe once more than one instance can be running).
export async function nextRank(client = pool) {
  const { rows } = await client.query("SELECT nextval('rank_seq') AS v");
  return Number(rows[0].v);
}

async function seedIfEmpty(client) {
  const { rows } = await client.query("SELECT COUNT(*) AS count FROM users");
  if (Number(rows[0].count) > 0) return;

  await client.query("BEGIN");
  try {
    for (const u of seedUsers) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `INSERT INTO users (id, name, username, email, password_hash, role, active, status, invite_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)`,
        [u.id, u.name, u.username.toLowerCase(), u.email.toLowerCase(), bcrypt.hashSync(u.password, 10), u.role, u.active ? 1 : 0, u.status]
      );
    }

    // seed products keep their declared order (first-declared shows first);
    // product listing sorts by created_at DESC so newer real products
    // surface above them
    for (let index = 0; index < seedProducts.length; index += 1) {
      const p = seedProducts[index];
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `INSERT INTO products (id, name, category, active_ingredient, formulation, unit, pack_size, manufacturer, reorder_level, price_per_unit, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          p.id,
          p.name,
          p.category,
          p.activeIngredient,
          p.formulation,
          p.unit,
          p.packSize,
          p.manufacturer,
          p.reorderLevel,
          p.pricePerUnit ?? null,
          seedProducts.length - index,
        ]
      );
      for (const b of p.batches) {
        // eslint-disable-next-line no-await-in-loop
        await client.query(
          "INSERT INTO batches (product_id, batch_no, mfg_date, expiry_date, qty) VALUES ($1, $2, $3, $4, $5)",
          [p.id, b.batchNo, b.mfgDate, b.expiryDate, b.qty]
        );
      }
    }

    for (const m of seedMovements) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `INSERT INTO movements (id, product_id, product_name, batch_no, type, qty, unit, date, note, performed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [m.id, m.productId ?? null, m.productName, m.batchNo ?? null, m.type, m.qty, m.unit ?? null, m.date, m.note || "", m.performedBy || "Unknown user"]
      );
    }

    await client.query("SELECT setval('rank_seq', $1, true)", [seedProducts.length + 1]);
    await client.query("COMMIT");
    console.log("[db] seeded fresh database");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

let readyPromise = null;

export function ready() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const client = await pool.connect();
      try {
        await client.query(SCHEMA_SQL);
        await migrateColumns(client);
        await seedIfEmpty(client);
      } finally {
        client.release();
      }
    })();
  }
  return readyPromise;
}
