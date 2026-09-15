// This builds the invite email's subject/body/link — pure content, no
// sending. The actual send happens server-side (server/lib/email.js via
// server/routes/users.js), never in the browser, since that's the only
// place a provider credential (here, a Gmail App Password) can be held
// without shipping it to every visitor. If no credential is configured,
// the server logs the email to the `outbox` table instead of sending it,
// so the invite/activation flow still works end-to-end for local testing.

export function generateInviteToken() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function buildInviteEmail({ name, username, email, token, role }) {
  const activationPath = `/activate/${token}`;
  return {
    to: email,
    subject: "Set your password for Farmer's Help",
    activationPath,
    body:
      `Hi ${name},\n\n` +
      `An Admin has created a Farmer's Help account for you (role: ${role}).\n` +
      `Your username is: ${username}\n` +
      `You can sign in with either your username or this email address once activated.\n\n` +
      `Set your password to finish activating your account:\n\n` +
      `${activationPath}\n\n` +
      `If you weren't expecting this, you can ignore this email.`,
  };
}
