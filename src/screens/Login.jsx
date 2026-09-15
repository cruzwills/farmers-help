import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Card, Chip, IconButton, InputAdornment, TextField, Typography } from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { useInventoryActions } from "../context/InventoryContext";
import { DEMO_SEED_PASSWORD } from "../data/products";
import { brand } from "../theme";

const DEMO_ACCOUNTS = [
  { label: "Admin", username: "amina" },
  { label: "Manager", username: "david" },
  { label: "Staff", username: "grace" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useInventoryActions();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const attemptLogin = async (attemptIdentifier, attemptPassword) => {
    setSubmitting(true);
    setError("");
    try {
      await login(attemptIdentifier.trim(), attemptPassword.trim());
      navigate("/");
    } catch (err) {
      setError(err.message || "Couldn't sign in — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    attemptLogin(identifier, password);
  };

  const quickLogin = (accountIdentifier) => {
    setIdentifier(accountIdentifier);
    setPassword(DEMO_SEED_PASSWORD);
    attemptLogin(accountIdentifier, DEMO_SEED_PASSWORD);
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

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Sign in
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>Log in to manage your stock.</Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Username or Email"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            fullWidth
            autoFocus
            required
          />
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "hide password" : "show password"} edge="end">
                    {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {error && (
            <Typography variant="body2" sx={{ color: brand.danger, fontWeight: 700 }}>
              {error}
            </Typography>
          )}
          <Button type="submit" variant="contained" size="large" disabled={submitting || !identifier.trim() || !password}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </Box>

        <Box sx={{ border: "1.5px dashed", borderColor: "divider", borderRadius: "12px", p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
            DEMO ACCOUNTS (SEEDED FOR TESTING)
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <Chip
                key={acc.username}
                label={`Log in as ${acc.label}`}
                onClick={() => quickLogin(acc.username)}
                disabled={submitting}
                sx={{ fontWeight: 700, backgroundColor: "background.paper", border: "1.5px solid", borderColor: "divider" }}
              />
            ))}
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Or type it yourself — username <code>amina</code>/<code>david</code>/<code>grace</code> (or
            their email) with password {DEMO_SEED_PASSWORD}
          </Typography>
        </Box>
      </Card>
      </Box>
    </Box>
  );
}
