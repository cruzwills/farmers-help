import { Box, Button, IconButton, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import { useNavigate } from "react-router-dom";

export default function ReportHeader({ title, subtitle, onExport, backTo }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <IconButton
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            sx={{ border: "1.5px solid", borderColor: "divider", flexShrink: 0 }}
            aria-label="back"
          >
            <ArrowBackRoundedIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 900 }} noWrap>
            {title}
          </Typography>
        </Box>
        {onExport && (
          <Button
            onClick={onExport}
            startIcon={<FileDownloadRoundedIcon />}
            variant="outlined"
            size="small"
            sx={{ borderColor: "divider", color: "text.primary", flexShrink: 0 }}
          >
            CSV
          </Button>
        )}
      </Box>
      {subtitle && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
