# Farmer's Help — Agrochemical Distribution Stock Manager

A mobile-first stock/inventory management web app for Farmer's Help, an
agrochemical (crop-protection + fertilizer) distribution business.
Built with React, Vite, and Material UI, with a visual identity built
around the company's own tractor logo and "making farming easier!!"
tagline rather than a generic SaaS dashboard look. Brand colors
(`brand.primary`/`primaryDark`/`accent` in [src/theme.js](src/theme.js))
are sampled directly from the logo; the processed logo assets live in
[public/brand/](public/brand/) (full lockup + an icon-only crop used in
the header/favicon).

## Getting started

```bash
npm install
cp .env.example .env   # then fill in POSTGRES_URL — see "Backend & database"
npm run dev:all
```

`dev:all` runs the Vite frontend (`:5173`) and the real API server
(`:4000`) together — Vite proxies `/api/*` to the backend
(`vite.config.js`), so the browser only ever talks to `:5173` and
session cookies just work with zero CORS setup. Open
`http://localhost:5173`. The app is optimized for phone-width
viewports — use your browser's device toolbar (or an actual phone) for
the intended experience.

Need them separately (e.g. to watch backend logs on their own)?
`npm run dev` (frontend only) and `npm run server` (backend only, in a
second terminal) — `npm run dev` alone won't have anything to talk to.

## Backend & database

This is a real client-server app, not a frontend-only demo: a Node/Express
API ([server/](server/)) backed by a real **Postgres** database (any
Postgres works — Vercel Postgres/Neon in production, any Postgres
connection string for local dev). Point `POSTGRES_URL` (or
`DATABASE_URL`) in `.env` at it; the schema is created and sample data
seeded automatically the first time the server connects to an empty
database (`server/db.js`).

This app used to run on a local SQLite file with no separate database
to provision — that only worked for a single machine talking to a
single file on disk. Moving to Postgres was required to deploy on
Vercel: serverless functions have no persistent local disk, so a
SQLite file written there would be wiped (and inconsistent) between
requests.

- **Auth** is real: `bcryptjs`-hashed passwords, `express-session`
  cookie sessions (`server/lib/auth.js`). No JWTs, no client-side
  credential checks — the frontend never sees a password hash.
- **Permissions are enforced on the server**, not just hidden in the
  UI — every mutating route requires the right role
  (`requirePermission()` in `server/lib/auth.js`, reusing the exact
  same [src/utils/permissions.js](src/utils/permissions.js) the
  frontend uses for its own gating, imported directly since both sides
  are plain ESM). A Staff account can't create a product by hitting
  the API directly any more than it can from the UI.
- **The frontend's data layer** ([src/context/InventoryContext.jsx](src/context/InventoryContext.jsx))
  talks to the API via [src/api/client.js](src/api/client.js) and keeps
  the *same* public hooks (`useInventoryState`, `useInventoryActions`,
  `useCurrentUser`, `usePermission`) it had when everything lived in
  `localStorage` — only the internals changed, so none of the ~20
  screens/components that consume those hooks needed to change.
- **Email is real, when configured** — invite emails send via Gmail
  SMTP (Nodemailer) if `EMAIL_APP_PASSWORD` is set (see "Inviting a new
  user" below and `.env.example`); otherwise it gracefully falls back
  to logging the email to the database only, so the app still works
  fully without any email account configured.

## Screens

- **Dashboard** — stock health at a glance: SKUs tracked, units on hand,
  low-stock count, expiring/expired batch count, a "needs attention"
  feed, and recent activity.
- **Inventory** — searchable, filterable (by Herbicide / Insecticide /
  Fungicide / Fertilizer) product list with live stock and status badges.
- **Product detail** — full product info, batch list sorted by expiry
  (FEFO), and Stock In / Stock Out actions with quantity steppers.
- **Alerts** — low-stock and near-expiry/expired batches in one place.
- **Activity log** — a chronological, filterable log of every stock
  movement, including manual corrections.
- **Login** — sign in with your username or email + password before you
  can reach any other screen (see below).
- **Settings** — user & role management, and your account's own info
  with a Log out button.
- **Reports** — a report module (Settings → Reports, Manager/Admin
  only); see below.

## Reports

Five reports, each filterable and exportable to CSV, live at
[src/screens/reports/](src/screens/reports/):

- **Stock Valuation** — total inventory value, broken down by category
  (with a share-of-value bar per category) and by product.
- **Stock Movements** — stock in vs stock out over any date range,
  filterable by category, with a per-product in/out breakdown.
- **Expiry Report** — every batch in stock grouped by shelf life left
  (expired / within 30 days / 31–90 days / good), filterable by category.
- **Reorder Report** — every product at or below its reorder level, with
  a suggested restock quantity (tops back up to 2× the reorder point)
  and its estimated cost.
- **Stock Adjustment Report** — the audit trail of manual corrections
  and batch write-offs, with who made each one and why.

All five share [ReportGate](src/components/reports/ReportGate.jsx) (the
Manager/Admin permission check) and [ReportHeader](src/components/reports/ReportHeader.jsx)
(back button, subtitle, CSV export button) rather than duplicating that
UI. CSV export ([src/utils/csv.js](src/utils/csv.js)) runs entirely in
the browser — no server round-trip needed for something this size.

## CRUD

Every entity is fully manageable, not just quantities:

- **Products** — create (Inventory → Add Product / FAB), edit (Product
  Detail → ⋮ menu → Edit product), delete (⋮ menu → Delete product,
  with a confirmation dialog). Product IDs are auto-generated per
  category (e.g. `HRB-004`).
- **Batches** — created via Stock In, corrected via each batch's Edit
  action (fixes data-entry mistakes without recording a fake sale),
  removed via Remove (for disposed/written-off/incorrect batches).
- **Bulk upload** — Inventory → the upload icon (Admin/Manager, same
  permission as Add Product) accepts an .xlsx/.xls/.csv file to add or
  restock many products in one go. "Download template" gets you the
  exact expected columns with example rows; each row is one batch — a
  brand-new product needs its details on its first row only, and every
  later row for it (more batches, or a restock of an existing product)
  just needs the batch number, dates, and quantity. Rows are parsed and
  validated client-side and previewed (with specific per-row error
  reasons) before anything is committed — see
  [src/utils/bulkImport.js](src/utils/bulkImport.js) and
  [src/components/inventory/BulkUploadDialog.jsx](src/components/inventory/BulkUploadDialog.jsx).
  Only the valid rows are then sent to `POST /api/products/bulk-import`,
  which does the actual inserts in one transaction
  (`server/routes/products.js`) and returns real created/restocked
  counts. File *parsing* stays client-side via SheetJS — note the
  `xlsx` dependency in `package.json` points at SheetJS's own CDN
  tarball, not the npm registry version, because the npm one has
  unpatched high-severity CVEs and this feature parses untrusted
  uploaded files.
- **Movements** — an immutable audit trail (`IN`, `OUT`, `ADJUST`,
  `REMOVE`) is written for every change above; nothing silently
  mutates stock without a logged reason.

## Users & permissions

Three roles, defined in [src/utils/permissions.js](src/utils/permissions.js):

| Role    | Can do |
|---------|--------|
| Admin   | Everything — manage users, products, batches, stock, reports |
| Manager | Manage products & batches, stock in/out, view reports — no user management |
| Staff   | Stock in/out only — read-only everywhere else, no reports access |

Admins manage the team from **Settings**: add a user, edit their role,
deactivate/remove them (an Admin can't delete themselves or the last
remaining Admin, to avoid locking the team out).

### Inviting a new user

Adding a user in Settings creates them server-side in a **Pending
activation** state (a real row in the `users` table, no password hash
yet) with a cryptographically random invite token
(`crypto.randomBytes` in `server/routes/auth.js`), and sends them a
real email to set their own password, via Gmail SMTP
([server/lib/email.js](server/lib/email.js), using
[Nodemailer](https://nodemailer.com/)).

**To actually send emails**, copy `.env.example` to `.env` in the
project root and fill in `EMAIL_APP_PASSWORD`:

1. Turn on 2-Step Verification on the sending Google account
   (`farmershelp.stock@gmail.com` by default — required before Gmail
   will issue App Passwords):
   <https://myaccount.google.com/signinoptions/two-step-verification>
2. Generate an App Password for "Mail":
   <https://myaccount.google.com/apppasswords>
3. Paste the 16-character code into `.env` as `EMAIL_APP_PASSWORD`
   (never your normal Gmail password — Gmail's SMTP rejects that from
   apps like this one). Restart the server.

**Without that configured**, invites still work end-to-end — the email
just doesn't leave the server. Either way, every invite is written to a
real `outbox` table (Settings → "Sent invitations" / the mail icon next
to a pending user), tagged **Sent** or **Not sent** so an Admin can see
at a glance whether delivery actually happened; opening one shows the
reason it failed if it did (e.g. no credential configured, or Gmail
rejected the login). This is the same UI either way — open it to see
the exact email and follow its real activation link
(`/activate/:token`, [src/screens/SetPassword.jsx](src/screens/SetPassword.jsx),
backed by `GET/POST /api/auth/invite` and `/api/auth/activate`) to set
a password and sign in as that user, which is handy for testing without
waiting on real email at all.

### Signing in

Every user has both a unique **username** and a unique **email**
(`server/db.js`'s `users` table has a `UNIQUE` index on each). `/login`
takes a single "Username or Email" field — `POST /api/auth/login`
looks the submitted `identifier` up against both columns
case-insensitively (`WHERE lower(email) = lower(?) OR lower(username) = lower(?)`
in `server/routes/auth.js`), then checks the password against the
`bcryptjs` hash stored for that user and, on success, starts an
`express-session` cookie session. An Admin sets each user's username
when creating or editing them in Settings (auto-suggested from their
name, editable, validated for format — 3-30 characters, letters/numbers/
`.`/`_`/`-` — and uniqueness); it's included in their invite email
alongside instructions that they can sign in with either it or their
email.

Once you're signed in as a role, **you stay that role** — there is no
in-app switcher, by design (an earlier version had one; it was removed
because it let any role jump straight to Admin). To try a different
role you have to log out (Settings, or the top-bar avatar menu) and
sign back in as someone else — `/login` shows the three seeded demo
accounts' usernames for exactly this purpose (one click each). Any
route under the main app shell redirects to `/login` if the session
check (`GET /api/auth/me`) comes back signed-out
([src/components/layout/AppShell.jsx](src/components/layout/AppShell.jsx)).

Every stock-in, stock-out, batch correction and batch removal records
who performed it (`performedBy` on the movement) — visible in the
Activity Log and in the Stock Adjustment Report.

## Responsive layout

The UI is mobile-first (bottom nav, single-column feeds, full-screen
dialogs) below 900px, and switches to a desktop web-app layout above
it: a persistent left sidebar replaces the bottom nav, stat tiles
expand to a 4-column grid, the inventory list becomes a multi-column
card grid, and dialogs render as centered modals instead of full-screen
sheets.

## Data

Sample data (12 realistic products across all four categories, with
batch numbers and expiry dates) lives in [src/data/products.js](src/data/products.js)
and is imported directly by `server/db.js` to seed the database the
first time it connects to one with no users in it. From then on the
database — not this file — is the source of truth; re-seeding means
dropping the `users`/`products`/`batches`/`movements`/`outbox` tables
(the server recreates and reseeds them automatically on next start).

## Deployment (Vercel)

The frontend (Vite static build) and backend (the whole Express app as
one serverless function, [api/index.js](api/index.js)) deploy together
from this one repo — see [vercel.json](vercel.json). To go live:

1. **Create a Postgres database.** In your Vercel project dashboard:
   Storage → Create Database → Postgres (Neon-backed). This sets
   `POSTGRES_URL` (and related vars) for you automatically — no manual
   copying of a connection string required.
2. **Set the other production env vars** in the Vercel project's
   Settings → Environment Variables (see `.env.example` for what each
   one does): `SESSION_SECRET` (required — generate one, don't skip
   this), `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `APP_BASE_URL` (your real
   `https://...vercel.app` domain, so invite email links work).
3. **Deploy** — connect this repo in the Vercel dashboard (or `vercel
   --prod` from the CLI once you're logged in and the project is
   linked with `vercel link`). The build runs `npm run build` for the
   frontend; the backend needs no separate build step.
4. Sessions are stored in Postgres (`connect-pg-simple`, table
   `session`, auto-created) rather than in memory, because serverless
   functions don't share memory between invocations or survive cold
   starts — an in-memory session store would log everyone out
   randomly.

## Design notes

- Bottom navigation (thumb-reachable), large tap targets (48px+), and
  bold high-contrast typography for outdoor/bright-light legibility.
- Category colour-coding (herbicide/insecticide/fungicide/fertilizer)
  and a hazard-stripe accent motif echo crop-protection label design
  instead of a generic corporate blue dashboard.
- Stock-out defaults to FEFO (first-expiry-first-out) batch selection,
  which matters for agrochemicals with shelf-life limits.
- Micro-interactions throughout: a subtle route-change fade/slide
  (`.page-transition` in [app.css](app.css), applied by keying the main
  content on the current path in [AppShell](src/components/layout/AppShell.jsx)),
  a shared hover/press treatment for every clickable card
  (`interactiveCardSx`/`interactiveRowSx` in [src/theme.js](src/theme.js)),
  a branded boot splash shown until React mounts (`#boot-splash` in
  `index.html`, removed automatically since React replaces `#root`'s
  contents), and a consistent [EmptyState](src/components/common/EmptyState.jsx)
  component (with a positive "tone" variant) instead of ad hoc "no
  results" text scattered per screen. Deliberately no drop shadows on
  cards at rest — borders read better than shadows in bright outdoor
  light, so lift/depth only appears as hover feedback, not by default.
