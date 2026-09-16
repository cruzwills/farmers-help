import { forwardRef, useEffect, useState } from "react";
import { AppBar, Box, Button, Dialog, IconButton, Slide, TextField, Toolbar, Typography, useMediaQuery } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import QuantityStepper from "../common/QuantityStepper";
import { brand } from "../../theme";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function EditBatchDialog({ open, onClose, product, batch, onSubmit }) {
  const fullScreen = useMediaQuery("(max-width:600px)");
  const [batchNo, setBatchNo] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [qty, setQty] = useState(0);

  useEffect(() => {
    if (open && batch) {
      setBatchNo(batch.batchNo);
      setMfgDate(batch.mfgDate || "");
      setExpiryDate(batch.expiryDate);
      setQty(batch.qty);
    }
  }, [open, batch]);

  if (!product || !batch) return null;

  const duplicateBatchNo =
    batchNo.trim() !== batch.batchNo && product.batches.some((b) => b.batchNo === batchNo.trim());
  const canSubmit = batchNo.trim() && expiryDate && qty >= 0 && !duplicateBatchNo;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ batchNo: batchNo.trim(), mfgDate, expiryDate, qty });
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
      <AppBar position="relative" sx={{ backgroundColor: brand.ink }} elevation={0}>
        <Toolbar>
          <Typography sx={{ flex: 1, fontWeight: 800 }}>Edit batch · {product.name}</Typography>
          <IconButton edge="end" onClick={onClose} sx={{ color: "#fff" }} aria-label="close">
            <CloseRoundedIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2.5, minWidth: { sm: 420 } }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Use this to correct data-entry mistakes. Changing quantity here logs a stock adjustment, not a
          sale or delivery.
        </Typography>
        <TextField
          label="Batch number"
          value={batchNo}
          onChange={(e) => setBatchNo(e.target.value)}
          fullWidth
          error={duplicateBatchNo}
          helperText={duplicateBatchNo ? "This product already has a batch with that number." : ""}
        />
        <Box sx={{ display: "flex", flexDirection: "row", gap: 1.5, "@media (max-width:359px)": { flexDirection: "column" } }}>
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
            Quantity on hand
          </Typography>
          <QuantityStepper value={qty} onChange={setQty} min={0} unit={product.unit} />
        </Box>
        <Button variant="contained" size="large" disabled={!canSubmit} onClick={handleSubmit} sx={{ backgroundColor: brand.ink, mt: 1 }}>
          Save correction
        </Button>
      </Box>
    </Dialog>
  );
}
