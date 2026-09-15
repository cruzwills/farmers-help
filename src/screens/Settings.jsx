import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Snackbar,
  Alert,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import ScheduleSendRoundedIcon from "@mui/icons-material/ScheduleSendRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useCurrentUser, useInventoryActions, useInventoryState, usePermission } from "../context/InventoryContext";
import { ROLE_META, ROLES } from "../utils/permissions";
import ConfirmDialog from "../components/common/ConfirmDialog";
import UserFormDialog from "../components/settings/UserFormDialog";
import EmailPreviewDialog from "../components/settings/EmailPreviewDialog";
import { interactiveCardSx, interactiveRowSx } from "../theme";

export default function Settings() {
  const navigate = useNavigate();
  const { users, outbox } = useInventoryState();
  const { addUser, updateUser, deleteUser, resendInvite, logout } = useInventoryActions();
  const currentUser = useCurrentUser();
  const canManageUsers = usePermission("manageUsers");
  const canViewReports = usePermission("viewReports");

  const [addOpen, setAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [previewEmail, setPreviewEmail] = useState(null);
  const [toast, setToast] = useState("");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Typography variant="h5" sx={{ fontWeight: 900 }}>
        Settings
      </Typography>

      <Card sx={{ p: 2.5 }}>
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700, mb: 1.5 }}>
          SIGNED IN AS
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800 }} noWrap>
              {currentUser?.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
              {currentUser?.email}
            </Typography>
          </Box>
          {currentUser && (
            <Chip
              size="small"
              label={currentUser.role}
              sx={{ fontWeight: 800, backgroundColor: ROLE_META[currentUser.role].soft, color: ROLE_META[currentUser.role].color }}
            />
          )}
        </Box>
        {currentUser && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
            {ROLE_META[currentUser.role].description}
          </Typography>
        )}
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutRoundedIcon />}
          onClick={() => {
            logout();
            navigate("/login");
          }}
          sx={{ borderColor: "divider", color: "text.primary", mt: 2 }}
        >
          Log out
        </Button>
      </Card>

      <Card
        onClick={() => canViewReports && navigate("/reports")}
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          opacity: canViewReports ? 1 : 0.55,
          ...(canViewReports ? interactiveCardSx : { cursor: "default" }),
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            backgroundColor: "#ECE8F5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AssessmentRoundedIcon sx={{ color: "#5C4B8A" }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800 }}>Reports</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {canViewReports ? "Valuation, movements, expiry, reorder and adjustment reports." : "Managers and Admins only."}
          </Typography>
        </Box>
        {canViewReports ? (
          <ChevronRightRoundedIcon sx={{ color: "text.secondary" }} />
        ) : (
          <LockRoundedIcon sx={{ color: "text.secondary" }} fontSize="small" />
        )}
      </Card>

      <Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h6">Users &amp; permissions</Typography>
          {canManageUsers && (
            <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setAddOpen(true)} sx={{ fontWeight: 700, minHeight: "auto" }}>
              Add user
            </Button>
          )}
        </Box>

        {!canManageUsers && (
          <Card sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, backgroundColor: "#EDEAE0" }}>
            <LockRoundedIcon sx={{ color: "text.secondary" }} fontSize="small" />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Only Admins can add, edit or remove users. You can view the team below.
            </Typography>
          </Card>
        )}

        <Card sx={{ overflow: "hidden" }}>
          {users.map((u, i) => {
            const pending = u.status === "invited";
            const latestEmail = outbox.find((o) => o.userId === u.id);
            return (
              <Box key={u.id}>
                {i > 0 && <Divider />}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.75, flexWrap: "wrap" }}>
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                      <Typography sx={{ fontWeight: 800 }} noWrap>
                        {u.name}
                      </Typography>
                      {u.id === currentUser?.id && <Chip size="small" label="You" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />}
                      {!u.active && <Chip size="small" label="Inactive" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />}
                      {pending && (
                        <Chip
                          size="small"
                          label="Pending activation"
                          sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800, backgroundColor: "#FCF0DA", color: "#B8790E" }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
                      @{u.username} · {u.email}
                    </Typography>
                    <Chip
                      size="small"
                      label={u.role}
                      sx={{ mt: 0.5, fontWeight: 800, backgroundColor: ROLE_META[u.role].soft, color: ROLE_META[u.role].color }}
                    />
                  </Box>
                  {canManageUsers && (
                    <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                      {pending && latestEmail && (
                        <IconButton onClick={() => setPreviewEmail(latestEmail)} aria-label={`view invite email for ${u.name}`}>
                          <MailOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      )}
                      {pending && (
                        <IconButton
                          onClick={async () => {
                            try {
                              const { outboxEntry } = await resendInvite({ userId: u.id });
                              setToast(
                                outboxEntry.sent
                                  ? `Invitation email sent to ${u.email}`
                                  : `Invitation created, but the email couldn't be sent — see it in Sent invitations below.`
                              );
                            } catch {
                              // the shared error toast (AppShell) already surfaces this
                            }
                          }}
                          aria-label={`resend invite to ${u.name}`}
                        >
                          <ScheduleSendRoundedIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton onClick={() => setEditingUser(u)} aria-label={`edit ${u.name}`}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => setDeletingUser(u)} aria-label={`delete ${u.name}`} disabled={u.id === currentUser?.id}>
                        <DeleteOutlineRoundedIcon fontSize="small" color={u.id === currentUser?.id ? "disabled" : "error"} />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Card>
      </Box>

      {canManageUsers && outbox.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Sent invitations
          </Typography>
          <Card sx={{ overflow: "hidden" }}>
            {outbox.slice(0, 8).map((o, i) => (
              <Box key={o.id}>
                {i > 0 && <Divider />}
                <Box
                  onClick={() => setPreviewEmail(o)}
                  sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, ...interactiveRowSx }}
                >
                  <MailOutlineRoundedIcon sx={{ color: "text.secondary" }} fontSize="small" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }} noWrap>
                      {o.subject} → {o.to}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {new Date(o.sentAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={o.sent ? "Sent" : "Not sent"}
                    sx={{
                      height: 22,
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      backgroundColor: o.sent ? "#E7F0E4" : "#FCF0DA",
                      color: o.sent ? "#14532D" : "#B8790E",
                    }}
                  />
                  <ChevronRightRoundedIcon sx={{ color: "text.secondary" }} fontSize="small" />
                </Box>
              </Box>
            ))}
          </Card>
        </Box>
      )}

      <Card sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Role permissions</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {ROLES.map((r) => (
            <Box key={r} sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}>
              <Chip size="small" label={r} sx={{ fontWeight: 800, backgroundColor: ROLE_META[r].soft, color: ROLE_META[r].color, mt: 0.25 }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {ROLE_META[r].description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Card>

      <UserFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode="create"
        existingEmails={users.map((u) => u.email)}
        existingUsernames={users.map((u) => u.username)}
        onSubmit={async (user) => {
          try {
            const { outboxEntry } = await addUser(user);
            setToast(
              outboxEntry.sent
                ? `Invitation email sent to ${user.email}`
                : `User created, but the invite email couldn't be sent — see it in Sent invitations below.`
            );
          } catch {
            // the shared error toast (AppShell) already surfaces this
          }
        }}
      />
      <UserFormDialog
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        mode="edit"
        initialUser={editingUser}
        existingEmails={users.map((u) => u.email)}
        existingUsernames={users.map((u) => u.username)}
        onSubmit={(updates) => updateUser({ userId: editingUser.id, updates })}
      />
      <ConfirmDialog
        open={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        title="Remove this user?"
        message={deletingUser ? `${deletingUser.name} will lose access to Farmer's Help. This cannot be undone.` : ""}
        confirmLabel="Remove user"
        danger
        onConfirm={() => deleteUser({ userId: deletingUser.id })}
      />
      <EmailPreviewDialog open={Boolean(previewEmail)} onClose={() => setPreviewEmail(null)} email={previewEmail} />
      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast("")} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setToast("")} severity="success" variant="filled" sx={{ fontWeight: 700 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
