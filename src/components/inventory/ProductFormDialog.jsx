import { forwardRef, useEffect, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Dialog,
  Divider,
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
import { CATEGORIES, FORMULATIONS, UNITS, addDays, today } from "../../utils/inventoryHelpers";
import QuantityStepper from "../common/QuantityStepper";
import { brand } from "../../theme";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const blankProduct = {
  name: "",
  category: "Herbicide",
  activeIngredient: "",
  formulation: "SL",
  unit: "L",
  packSize: "",
  manufacturer: "",
  reorderLevel: 50,
  pricePerUnit: "",
};

export default function ProductFormDialog({ open, onClose, mode = "create", initialProduct, onSubmit }) {
  const fullScreen = useMediaQuery("(max-width:600px)");
  const [form, setForm] = useState(blankProduct);
  const [addOpeningStock, setAddOpeningStock] = useState(true);
  const [batchNo, setBatchNo] = useState("");
  const [expiryDate, setExpiryDate] = useState(addDays(new Date(), 365));
  const [qty, setQty] = useState(0);

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialProduct) {
        setForm({
          name: initialProduct.name,
          category: initialProduct.category,
          activeIngredient: initialProduct.activeIngredient,
          formulation: initialProduct.formulation,
          unit: initialProduct.unit,
          packSize: initialProduct.packSize,
          manufacturer: initialProduct.manufacturer,
          reorderLevel: initialProduct.reorderLevel,
          pricePerUnit: initialProduct.pricePerUnit ?? "",
        });
      } else {
        setForm(blankProduct);
        setAddOpeningStock(true);
        setBatchNo("");
        setExpiryDate(addDays(new Date(), 365));
        setQty(0);
      }
    }
  }, [open, mode, initialProduct]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const requiredOk =
    form.name.trim() &&
    form.activeIngredient.trim() &&
    form.packSize.trim() &&
    form.manufacturer.trim() &&
    Number(form.reorderLevel) > 0;
  const stockOk = mode === "edit" || !addOpeningStock || (batchNo.trim() && qty > 0 && expiryDate);
  const canSubmit = requiredOk && stockOk;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const product = {
      ...form,
      reorderLevel: Number(form.reorderLevel),
      pricePerUnit: form.pricePerUnit === "" ? undefined : Number(form.pricePerUnit),
    };
    if (mode === "create") {
      const openingBatch =
        addOpeningStock && batchNo.trim() && qty > 0
          ? { batchNo: batchNo.trim(), mfgDate: today(), expiryDate, qty }
          : null;
      onSubmit({ product, openingBatch });
    } else {
      onSubmit({ updates: product });
    }
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
          <Typography sx={{ flex: 1, fontWeight: 800 }}>
            {mode === "create" ? "Add Product" : `Edit ${initialProduct?.name}`}
          </Typography>
          <IconButton edge="end" onClick={onClose} sx={{ color: "#fff" }} aria-label="close">
            <CloseRoundedIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2, minWidth: { sm: 460 } }}>
        <TextField label="Product name" placeholder="e.g. RoundClear 41SL" value={form.name} onChange={set("name")} fullWidth autoFocus required />
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField select label="Category" value={form.category} onChange={set("category")} fullWidth disabled={mode === "edit"}>
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Formulation" value={form.formulation} onChange={set("formulation")} fullWidth>
            {FORMULATIONS.map((f) => (
              <MenuItem key={f} value={f}>
                {f}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <TextField
          label="Active ingredient"
          placeholder="e.g. Glyphosate 41% SL"
          value={form.activeIngredient}
          onChange={set("activeIngredient")}
          fullWidth
          required
        />
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField select label="Stock unit" value={form.unit} onChange={set("unit")} fullWidth>
            {UNITS.map((u) => (
              <MenuItem key={u} value={u}>
                {u}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Pack size" placeholder="e.g. 5 L Jerrycan" value={form.packSize} onChange={set("packSize")} fullWidth required />
        </Box>
        <TextField label="Manufacturer" placeholder="e.g. AgroCore Chemicals" value={form.manufacturer} onChange={set("manufacturer")} fullWidth required />
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField
            label="Reorder level"
            type="number"
            value={form.reorderLevel}
            onChange={set("reorderLevel")}
            fullWidth
            required
            helperText={`Alert when stock falls to/below this, in ${form.unit}`}
          />
          <TextField
            label="Price per unit (optional)"
            type="number"
            value={form.pricePerUnit}
            onChange={set("pricePerUnit")}
            fullWidth
          />
        </Box>

        {mode === "create" && (
          <>
            <Divider />
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography sx={{ fontWeight: 700 }}>Add opening stock now</Typography>
              <Switch checked={addOpeningStock} onChange={(e) => setAddOpeningStock(e.target.checked)} />
            </Box>
            {addOpeningStock && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField label="Batch number" placeholder="e.g. GLY-24E09" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} fullWidth />
                <TextField
                  label="Expiry date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                    Opening quantity
                  </Typography>
                  <QuantityStepper value={qty} onChange={setQty} min={0} unit={form.unit} />
                </Box>
              </Box>
            )}
          </>
        )}

        <Button variant="contained" color="primary" size="large" disabled={!canSubmit} onClick={handleSubmit} sx={{ mt: 1 }}>
          {mode === "create" ? "Add product" : "Save changes"}
        </Button>
      </Box>
    </Dialog>
  );
}
