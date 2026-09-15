import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Dialog,
  IconButton,
  Slide,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { forwardRef } from "react";
import QuantityStepper from "../common/QuantityStepper";
import { addDays, today } from "../../utils/inventoryHelpers";
import { brand } from "../../theme";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function StockInDialog({ open, onClose, product, onSubmit }) {
  const fullScreen = useMediaQuery("(max-width:600px)");
  const [batchNo, setBatchNo] = useState("");
  const [mfgDate, setMfgDate] = useState(today());
  const [expiryDate, setExpiryDate] = useState(addDays(new Date(), 365));
  const [qty, setQty] = useState(10);
  const [note, setNote] = useState("");

  if (!product) return null;

  const reset = () => {
    setBatchNo("");
    setMfgDate(today());
    setExpiryDate(addDays(new Date(), 365));
    setQty(10);
    setNote("");
  };

  const canSubmit = batchNo.trim().length > 0 && expiryDate && qty > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ batchNo: batchNo.trim(), mfgDate, expiryDate, qty, note: note.trim() });
    reset();
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
          <Typography sx={{ flex: 1, fontWeight: 800 }}>Stock In · {product.name}</Typography>
          <IconButton edge="end" onClick={onClose} sx={{ color: "#fff" }} aria-label="close">
            <CloseRoundedIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2.5, minWidth: { sm: 420 } }}>
        <TextField
          label="Batch number"
          placeholder="e.g. GLY-24E09"
          value={batchNo}
          onChange={(e) => setBatchNo(e.target.value)}
          fullWidth
          autoFocus
        />
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField
            label="Manufacture date"
            type="date"
            value={mfgDate}
            onChange={(e) => setMfgDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Expiry date"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            required
          />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
            Quantity received
          </Typography>
          <QuantityStepper value={qty} onChange={setQty} min={1} step={1} unit={product.unit} />
        </Box>
        <TextField
          label="Note (optional)"
          placeholder="Supplier, delivery reference…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
        <Button variant="contained" color="primary" size="large" disabled={!canSubmit} onClick={handleSubmit} sx={{ mt: 1 }}>
          Confirm stock in
        </Button>
      </Box>
    </Dialog>
  );
}
