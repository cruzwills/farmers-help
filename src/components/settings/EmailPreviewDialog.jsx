import { useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import { useNavigate } from "react-router-dom";
import { brand } from "../../theme";

export default function EmailPreviewDialog({ open, onClose, email }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!email) return null;

  const activationUrl = `${window.location.origin}${email.activationPath}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(activationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard permission denied — the link is still visible to select/copy manually
    }
  };

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: "16px", width: 440 } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 900 }}>
        <MailOutlineRoundedIcon sx={{ color: email.sent ? brand.primaryDark : "#B8790E" }} />
        {email.sent ? "Email sent" : "Email not sent"}
        <IconButton onClick={onClose} sx={{ ml: "auto" }} aria-label="close">
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography
          variant="caption"
          sx={{ color: email.sent ? brand.primaryDark : "#B8790E", fontWeight: 700, display: "block", mb: 0.5 }}
        >
          {email.sent
            ? "DELIVERED VIA FARMERSHELP.STOCK@GMAIL.COM"
            : email.sendError
              ? `COULDN'T SEND — ${email.sendError}`
              : "NOT SENT — RECORDED HERE ONLY"}
        </Typography>
        <Box sx={{ border: "1.5px solid", borderColor: "divider", borderRadius: "12px", p: 2, backgroundColor: "background.default" }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            To: {email.to}
          </Typography>
          <Typography sx={{ fontWeight: 800, mt: 0.5, mb: 1 }}>{email.subject}</Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-line", color: "text.secondary" }}>
            {email.body}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0, gap: 1, flexWrap: "wrap" }}>
        <Button onClick={copyLink} fullWidth variant="outlined" sx={{ borderColor: "divider", color: "text.primary" }}>
          {copied ? "Link copied" : "Copy activation link"}
        </Button>
        <Button
          onClick={() => {
            onClose();
            navigate(email.activationPath);
          }}
          fullWidth
          variant="contained"
        >
          Open activation link
        </Button>
      </DialogActions>
    </Dialog>
  );
}
