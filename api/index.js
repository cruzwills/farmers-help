// Vercel serverless entry point. The whole Express app (server/index.js)
// runs as one function — vercel.json rewrites every /api/* request here,
// and the app's own router handles the specific path from there.
import { app } from "../server/index.js";
import { ready } from "../server/db.js";

export default async function handler(req, res) {
  await ready();
  app(req, res);
}
