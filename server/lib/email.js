import nodemailer from "nodemailer";

// Real outbound email via Gmail SMTP. Configure with a Gmail *App
// Password* (not the account's normal password) in a local .env file —
// see .env.example. Gmail requires 2-Step Verification to be enabled on
// the account before it will issue App Passwords:
// https://myaccount.google.com/apppasswords
const EMAIL_USER = process.env.EMAIL_USER || "farmershelp.stock@gmail.com";
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;

let transporter = null;
if (EMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: EMAIL_USER, pass: EMAIL_APP_PASSWORD },
  });
} else {
  console.warn(
    "[email] EMAIL_APP_PASSWORD is not set — invite emails will be logged to the Outbox only, not actually sent. See .env.example."
  );
}

export async function sendRealEmail({ to, subject, text }) {
  if (!transporter) {
    return { sent: false, error: "No EMAIL_APP_PASSWORD configured on the server — see .env.example." };
  }
  try {
    await transporter.sendMail({ from: `"Farmer's Help" <${EMAIL_USER}>`, to, subject, text });
    return { sent: true, error: null };
  } catch (err) {
    console.error("[email] send failed:", err.message);
    return { sent: false, error: err.message };
  }
}
