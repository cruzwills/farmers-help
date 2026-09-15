import { forwardRef, useEffect, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Dialog,
  IconButton,
  Radio,
  Slide,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import QuantityStepper from "../common/QuantityStepper";
import { formatDate, sortBatchesByExpiry } from "../../utils/inventoryHelpers";
import { brand } from "../../theme";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function StockOutDialog({ open, onClose, product, onSubmit }) {
  const fullScreen = useMediaQuery("(max-width:600px)");
  const batches = product ? sortBatchesByExpiry(product.batches.filter((b) => b.qty > 0)) : [];
  const [selectedBatch, setSelectedBatch] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open && batches.length) {
      setSelectedBatch(batches[0].batchNo);
      setQty(1);
      setNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  if (!product) return null;

  const current = batches.find((b) => b.batchNo === selectedBatch);
  const maxQty = current ? current.qty : 0;
  const canSubmit = current && qty > 0 && qty <= maxQty;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ batchNo: selectedBatch, qty, note: note.trim() });
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
      <AppBar position="relative" sx={{ backgroundColor: brand.accent }} elevation={0}>
        <Toolbar>
          <Typography sx={{ flex: 1, fontWeight: 800, color: brand.ink }}>Stock Out · {product.name}</Typography>
          <IconButton edge="end" onClick={onClose} sx={{ color: brand.ink }} aria-label="close">
            <CloseRoundedIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2, minWidth: { sm: 420 } }}>
        {batches.length === 0 ? (
          <Typography sx={{ color: "text.secondary" }}>No stock available to dispatch.</Typography>
        ) : (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Choose batch (earliest expiry recommended)
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {batches.map((b, i) => (
                <Box
                  key={b.batchNo}
                  onClick={() => setSelectedBatch(b.batchNo)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1,
                    borderRadius: "12px",
                    border: "2px solid",
                    borderColor: selectedBatch === b.batchNo ? brand.primary : "divider",
                    backgroundColor: selectedBatch === b.batchNo ? "#E7F0E4" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <Radio checked={selectedBatch === b.batchNo} value={b.batchNo} onChange={() => setSelectedBatch(b.batchNo)} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>
                      {b.batchNo} {i === 0 && <Box component="span" sx={{ color: brand.primaryDark }}>· use first</Box>}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Expires {formatDate(b.expiryDate)} · {b.qty} {product.unit} available
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                Quantity to dispatch (max {maxQty} {product.unit})
              </Typography>
              <QuantityStepper value={qty} onChange={setQty} min={1} max={maxQty} step={1} unit={product.unit} />
            </Box>
            <TextField
              label="Note (optional)"
              placeholder="Customer, invoice reference…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <Button variant="contained" color="secondary" size="large" disabled={!canSubmit} onClick={handleSubmit} sx={{ mt: 1 }}>
              Confirm stock out
            </Button>
          </>
        )}
      </Box>
    </Dialog>
  );
}
