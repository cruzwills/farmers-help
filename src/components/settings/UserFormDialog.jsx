import { forwardRef, useEffect, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Dialog,
  IconButton,
  MenuItem,
  Slide,
  Switch,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { ROLES, ROLE_META } from "../../utils/permissions";
import { brand } from "../../theme";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,30}$/;

function slugifyUsername(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 30);
}

export default function UserFormDialog({ open, onClose, mode = "create", initialUser, existingEmails = [], existingUsernames = [], onSubmit }) {
  const fullScreen = useMediaQuery("(max-width:600px)");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Staff");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialUser) {
        setName(initialUser.name);
        setUsername(initialUser.username || "");
        setUsernameTouched(true);
        setEmail(initialUser.email);
        setRole(initialUser.role);
        setActive(initialUser.active);
      } else {
        setName("");
        setUsername("");
        setUsernameTouched(false);
        setEmail("");
        setRole("Staff");
        setActive(true);
      }
    }
  }, [open, mode, initialUser]);

  // suggest a username from the name as they type it, until they edit
  // the username field themselves — then leave their choice alone
  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    if (!usernameTouched) setUsername(slugifyUsername(value));
  };

  const emailTaken =
    email.trim() &&
    existingEmails.some((e) => e.toLowerCase() === email.trim().toLowerCase() && e.toLowerCase() !== initialUser?.email?.toLowerCase());
  const usernameTaken =
    username.trim() &&
    existingUsernames.some(
      (u) => u?.toLowerCase() === username.trim().toLowerCase() && u?.toLowerCase() !== initialUser?.username?.toLowerCase()
    );
  const usernameInvalid = username.trim().length > 0 && !USERNAME_RE.test(username.trim());
  const canSubmit =
    name.trim() && USERNAME_RE.test(username.trim()) && !usernameTaken && EMAIL_RE.test(email.trim()) && !emailTaken;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), username: username.trim(), email: email.trim(), role, active });
    onClose();
  };

  return (
    <Dialog
      fullScreen={fullScreen}
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : "18px" } }}
    >
      <AppBar position="relative" sx={{ backgroundColor: brand.primaryDark }} elevation={0}>
        <Toolbar>
          <Typography sx={{ flex: 1, fontWeight: 800 }}>{mode === "create" ? "Add User" : `Edit ${initialUser?.name}`}</Typography>
          <IconButton edge="end" onClick={onClose} sx={{ color: "#fff" }} aria-label="close">
            <CloseRoundedIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2, minWidth: { sm: 420 } }}>
        <TextField label="Full name" value={name} onChange={handleNameChange} fullWidth autoFocus required />
        <TextField
          label="Username"
          value={username}
          onChange={(e) => {
            setUsernameTouched(true);
            setUsername(e.target.value);
          }}
          fullWidth
          required
          error={Boolean(usernameTaken || usernameInvalid)}
          helperText={
            usernameTaken
              ? "Another user already has this username."
              : usernameInvalid
                ? "3-30 characters: letters, numbers, dots, underscores or hyphens."
                : "Used to sign in, along with (or instead of) email."
          }
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
          error={Boolean(emailTaken)}
          helperText={emailTaken ? "Another user already has this email." : ""}
        />
        <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value)} fullWidth helperText={ROLE_META[role].description}>
          {ROLES.map((r) => (
            <MenuItem key={r} value={r}>
              {r}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>Account enabled</Typography>
            {mode === "create" && (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                They'll still need to set a password from the invite email either way.
              </Typography>
            )}
          </Box>
          <Switch checked={active} onChange={(e) => setActive(e.target.checked)} />
        </Box>
        {mode === "create" && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            We'll send {name.trim() || "them"} an email with a link to set their own password.
          </Typography>
        )}
        <Button variant="contained" color="primary" size="large" disabled={!canSubmit} onClick={handleSubmit} sx={{ mt: 1 }}>
          {mode === "create" ? "Send invite" : "Save changes"}
        </Button>
      </Box>
    </Dialog>
  );
}
