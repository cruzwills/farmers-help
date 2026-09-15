import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Card, CircularProgress, TextField, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useInventoryActions } from "../context/InventoryContext";
import { api } from "../api/client.js";
import { ROLE_META } from "../utils/permissions";
import { brand } from "../theme";

export default function SetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { activateUser } = useInventoryActions();

  const [invite, setInvite] = useState(undefined); // undefined = checking, null = invalid, object = valid
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .invite(token)
      .then((data) => !cancelled && setInvite(data))
      .catch(() => !cancelled && setInvite(null));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 8 && password === confirm && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !invite) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await activateUser({ token, password });
      setDone(true);
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setSubmitError(err.message || "Couldn't activate your account — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: brand.paper,
        backgroundImage: `radial-gradient(circle at 8% 8%, ${brand.accent}22 0%, transparent 38%), radial-gradient(circle at 94% 92%, ${brand.primary}1f 0%, transparent 42%)`,
      }}
    >
      <Box
        aria-hidden
        sx={{
          height: 5,
          backgroundImage: `repeating-linear-gradient(-45deg, ${brand.accent} 0 12px, ${brand.primaryDark} 12px 24px)`,
        }}
      />
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        <Card className="page-transition" sx={{ maxWidth: 420, width: "100%", p: 3.5, display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box component="img" src="/brand/logo-icon.png" alt="" aria-hidden sx={{ height: 44, width: "auto", flexShrink: 0 }} />
          <Typography sx={{ fontWeight: 900, letterSpacing: 0.5 }}>FARMER&apos;S HELP</Typography>
        </Box>

        {invite === undefined && !done && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} sx={{ color: brand.primaryDark }} />
          </Box>
        )}

        {invite === null && !done && (
          <>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              This invite link isn't valid
            </Typography>
            <Typography sx={{ color: "text.secondary" }}>
              It may have already been used, or the account may have been removed. Ask an Admin to resend
              your invitation from Settings.
            </Typography>
            <Button variant="contained" onClick={() => navigate("/")}>
              Back to Farmer&apos;s Help
            </Button>
          </>
        )}

        {invite && !done && (
          <>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Welcome, {invite.name.split(" ")[0]}
              </Typography>
              <Typography sx={{ color: "text.secondary" }}>
                Set a password to activate your <b style={{ color: ROLE_META[invite.role].color }}>{invite.role}</b> account and sign in.
              </Typography>
            </Box>
            <TextField
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={tooShort}
              helperText={tooShort ? "Use at least 8 characters." : "At least 8 characters."}
              fullWidth
              autoFocus
            />
            <TextField
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={mismatch}
              helperText={mismatch ? "Passwords don't match." : " "}
              fullWidth
            />
            {submitError && (
              <Typography variant="body2" sx={{ color: brand.danger, fontWeight: 700 }}>
                {submitError}
              </Typography>
            )}
            <Button variant="contained" size="large" disabled={!canSubmit} onClick={handleSubmit}>
              {submitting ? "Activating…" : "Activate account & sign in"}
            </Button>
          </>
        )}

        {done && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, py: 2 }}>
            <CheckCircleRoundedIcon sx={{ fontSize: 40, color: brand.primaryDark }} />
            <Typography sx={{ fontWeight: 800 }}>Account activated — signing you in…</Typography>
          </Box>
        )}
      </Card>
      </Box>
    </Box>
  );
}
