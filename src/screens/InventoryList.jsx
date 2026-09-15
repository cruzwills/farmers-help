import { useMemo, useState } from "react";
import { Box, Button, Chip, Fab, IconButton, InputAdornment, TextField, Tooltip, Typography, useMediaQuery } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import { useInventoryActions, useInventoryState, usePermission } from "../context/InventoryContext";
import { CATEGORIES, CATEGORY_META } from "../utils/inventoryHelpers";
import { CategoryIcon } from "../utils/categoryIcons";
import ProductCard from "../components/inventory/ProductCard";
import ProductFormDialog from "../components/inventory/ProductFormDialog";
import BulkUploadDialog from "../components/inventory/BulkUploadDialog";
import EmptyState from "../components/common/EmptyState";

export default function InventoryList() {
  const { products } = useInventoryState();
  const { addProduct } = useInventoryActions();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width:900px)");
  const canManageProducts = usePermission("manageProducts");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = category === "All" || p.category === category;
      if (!matchesCategory) return false;
      if (!q) return true;
      const haystack = [p.name, p.activeIngredient, p.manufacturer, ...p.batches.map((b) => b.batchNo)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [products, query, category]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Inventory
        </Typography>
        {canManageProducts && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            <Tooltip title="Bulk upload from Excel">
              <IconButton
                onClick={() => setBulkUploadOpen(true)}
                sx={{ border: "1.5px solid", borderColor: "divider" }}
                aria-label="bulk upload"
              >
                <UploadFileRoundedIcon />
              </IconButton>
            </Tooltip>
            {isDesktop && (
              <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setAddOpen(true)}>
                Add Product
              </Button>
            )}
          </Box>
        )}
      </Box>

      <TextField
        placeholder="Search product, active ingredient, batch no."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon sx={{ color: "text.secondary" }} />
            </InputAdornment>
          ),
        }}
      />

      <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 0.5, "&::-webkit-scrollbar": { display: "none" } }}>
        <Chip
          label="All"
          onClick={() => setCategory("All")}
          sx={{
            fontWeight: 800,
            px: 1,
            flexShrink: 0,
            backgroundColor: category === "All" ? "primary.dark" : "background.paper",
            color: category === "All" ? "#fff" : "text.primary",
            border: "1.5px solid",
            borderColor: category === "All" ? "primary.dark" : "divider",
          }}
        />
        {CATEGORIES.map((c) => {
          const meta = CATEGORY_META[c];
          const active = category === c;
          return (
            <Chip
              key={c}
              icon={<CategoryIcon category={c} sx={{ color: active ? "#fff !important" : `${meta.color} !important`, fontSize: 18 }} />}
              label={c}
              onClick={() => setCategory(c)}
              sx={{
                fontWeight: 800,
                backgroundColor: active ? meta.color : "background.paper",
                color: active ? "#fff" : "text.primary",
                border: "1.5px solid",
                borderColor: active ? meta.color : "divider",
                flexShrink: 0,
              }}
            />
          );
        })}
      </Box>

      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700 }}>
        {filtered.length} product{filtered.length !== 1 ? "s" : ""}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" },
          gap: 1.25,
        }}
      >
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
        {filtered.length === 0 && (
          <Box sx={{ gridColumn: "1/-1" }}>
            <EmptyState
              icon={<SearchOffRoundedIcon />}
              title="No products match"
              subtitle="Try a different search term or category filter."
            />
          </Box>
        )}
      </Box>

      {!isDesktop && canManageProducts && (
        <Fab
          color="primary"
          onClick={() => setAddOpen(true)}
          sx={{
            position: "fixed",
            right: 20,
            bottom: "calc(96px + env(safe-area-inset-bottom))",
            boxShadow: "0 6px 16px rgba(31,77,44,0.35)",
          }}
          aria-label="add product"
        >
          <AddRoundedIcon />
        </Fab>
      )}

      <ProductFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode="create"
        onSubmit={(payload) => addProduct(payload)}
      />
      <BulkUploadDialog open={bulkUploadOpen} onClose={() => setBulkUploadOpen(false)} />
    </Box>
  );
}
