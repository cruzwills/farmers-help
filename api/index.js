// Vercel serverless entry point. The whole Express app (server/index.js)
// runs as one function — vercel.json rewrites every /api/* request here,
// and the app's own router handles the specific path from there.
import { app } from "../server/index.js";
import { ready } from "../server/db.js";

export default async function handler(req, res) {
  await ready();
  // Express writes the response asynchronously — critically, express-session
  // delays res.end() until the session finishes saving to the store. If this
  // handler's promise resolves as soon as app(req, res) is *called* (rather
  // than when the response actually finishes), Vercel can freeze the
  // execution environment mid-save, silently dropping the just-created
  // session before it reaches Postgres. That produced an intermittent bug:
  // /api/auth/activate (and /login) would return 200 with a Set-Cookie, but
  // the session row hadn't actually committed yet, so an immediate follow-up
  // request could get "Not signed in." Waiting for res.on("finish") ties this
  // handler's lifetime to the real response, not just the call that starts it.
  await new Promise((resolve, reject) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    res.on("error", reject);
    app(req, res);
  });
}
