import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, Card, Divider, IconButton, Menu, MenuItem, Typography, ListItemIcon, ListItemText } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { useInventoryActions, useInventoryState, usePermission } from "../context/InventoryContext";
import {
  CATEGORY_META,
  STOCK_STATUS_META,
  getProductQty,
  getStockLevelStatus,
  sortBatchesByExpiry,
} from "../utils/inventoryHelpers";
import { CategoryIcon } from "../utils/categoryIcons";
import CategoryChip from "../components/common/CategoryChip";
import StatusPill from "../components/common/StatusPill";
import ConfirmDialog from "../components/common/ConfirmDialog";
import BatchRow from "../components/inventory/BatchRow";
import MovementItem from "../components/activity/MovementItem";
import StockInDialog from "../components/inventory/StockInDialog";
import StockOutDialog from "../components/inventory/StockOutDialog";
import ProductFormDialog from "../components/inventory/ProductFormDialog";
import EditBatchDialog from "../components/inventory/EditBatchDialog";
import EmptyState from "../components/common/EmptyState";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, movements } = useInventoryState();
  const { stockIn, stockOut, updateProduct, deleteProduct, updateBatch, deleteBatch } = useInventoryActions();
  const canManageProducts = usePermission("manageProducts");
  const canManageBatches = usePermission("manageBatches");
  const canMoveStock = usePermission("stockMovement");

  const [inOpen, setInOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [deleteProductOpen, setDeleteProductOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [deletingBatch, setDeletingBatch] = useState(null);

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>Product not found. It may have been deleted.</Typography>
        <Button variant="contained" onClick={() => navigate("/inventory")}>
          Back to inventory
        </Button>
      </Box>
    );
  }

  const meta = CATEGORY_META[product.category];
  const qty = getProductQty(product);
  const stockStatus = getStockLevelStatus(product);
  const stockMeta = STOCK_STATUS_META[stockStatus];
  const sortedBatches = sortBatchesByExpiry(product.batches);
  const productMovements = movements.filter((m) => m.productId === product.id).slice(0, 6);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ border: "1.5px solid", borderColor: "divider" }} aria-label="back">
            <ArrowBackRoundedIcon />
          </IconButton>
          <CategoryChip category={product.category} />
        </Box>
        {canManageProducts && (
          <>
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ border: "1.5px solid", borderColor: "divider" }}
              aria-label="product options"
            >
              <MoreVertRoundedIcon />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setEditProductOpen(true);
                }}
              >
                <ListItemIcon>
                  <EditRoundedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Edit product</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setDeleteProductOpen(true);
                }}
                sx={{ color: "error.main" }}
              >
                <ListItemIcon>
                  <DeleteOutlineRoundedIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Delete product</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>

      <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "14px",
              backgroundColor: meta.soft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CategoryIcon category={product.category} sx={{ color: meta.color, fontSize: 28 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
              {product.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {product.activeIngredient}
            </Typography>
          </Box>
        </Box>

        <Divider />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 1, columnGap: 1 }}>
          <InfoField label="Manufacturer" value={product.manufacturer} />
          <InfoField label="Pack size" value={product.packSize} />
          <InfoField label="Formulation" value={product.formulation} />
          <InfoField label="Reorder level" value={`${product.reorderLevel} ${product.unit}`} />
        </Box>

        <Divider />

        <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
              TOTAL STOCK ON HAND
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1 }}>
              {qty} <Typography component="span" variant="h6" sx={{ color: "text.secondary" }}>{product.unit}</Typography>
            </Typography>
          </Box>
          <StatusPill label={stockMeta.label} color={stockMeta.color} soft={stockMeta.soft} />
        </Box>

        {canMoveStock ? (
          <Box sx={{ display: "flex", gap: 1.25, mt: 0.5 }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              startIcon={<AddRoundedIcon />}
              onClick={() => setInOpen(true)}
            >
              Stock In
            </Button>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              size="large"
              startIcon={<RemoveRoundedIcon />}
              onClick={() => setOutOpen(true)}
              disabled={qty === 0}
            >
              Stock Out
            </Button>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            Your role doesn't have permission to log stock movements.
          </Typography>
        )}
      </Card>

      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Batches (earliest expiry first)
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {sortedBatches.map((b, i) => (
            <BatchRow
              key={b.batchNo}
              batch={b}
              unit={product.unit}
              recommended={i === 0 && b.qty > 0}
              onEdit={canManageBatches ? () => setEditingBatch(b) : undefined}
              onDelete={canManageBatches ? () => setDeletingBatch(b) : undefined}
            />
          ))}
          {sortedBatches.length === 0 && (
            <EmptyState
              icon={<Inventory2OutlinedIcon />}
              title="No batches yet"
              subtitle="Use Stock In above to record the first batch for this product."
            />
          )}
        </Box>
      </Box>

      {productMovements.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Recent movements
          </Typography>
          <Card sx={{ px: 1.5 }}>
            {productMovements.map((m, i) => (
              <Box key={m.id} sx={{ borderBottom: i < productMovements.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
                <MovementItem movement={m} />
              </Box>
            ))}
          </Card>
        </Box>
      )}

      <StockInDialog
        open={inOpen}
        onClose={() => setInOpen(false)}
        product={product}
        onSubmit={(payload) => stockIn({ productId: product.id, ...payload })}
      />
      <StockOutDialog
        open={outOpen}
        onClose={() => setOutOpen(false)}
        product={product}
        onSubmit={(payload) => stockOut({ productId: product.id, ...payload })}
      />
      <ProductFormDialog
        open={editProductOpen}
        onClose={() => setEditProductOpen(false)}
        mode="edit"
        initialProduct={product}
        onSubmit={({ updates }) => updateProduct({ productId: product.id, updates })}
      />
      <ConfirmDialog
        open={deleteProductOpen}
        onClose={() => setDeleteProductOpen(false)}
        title="Delete this product?"
        message={`This removes ${product.name} and all its batches from inventory. Past movement history is kept for your records. This cannot be undone.`}
        confirmLabel="Delete product"
        danger
        onConfirm={() => {
          deleteProduct({ productId: product.id });
          navigate("/inventory");
        }}
      />
      <EditBatchDialog
        open={Boolean(editingBatch)}
        onClose={() => setEditingBatch(null)}
        product={product}
        batch={editingBatch}
        onSubmit={(batch) => updateBatch({ productId: product.id, originalBatchNo: editingBatch.batchNo, batch })}
      />
      <ConfirmDialog
        open={Boolean(deletingBatch)}
        onClose={() => setDeletingBatch(null)}
        title="Remove this batch?"
        message={
          deletingBatch
            ? `This removes batch ${deletingBatch.batchNo} (${deletingBatch.qty} ${product.unit}) from stock. Use this for disposed or incorrectly entered batches. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove batch"
        danger
        onConfirm={() => deleteBatch({ productId: product.id, batchNo: deletingBatch.batchNo })}
      />
    </Box>
  );
}

function InfoField({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
        {label.toUpperCase()}
      </Typography>
      <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
    </Box>
  );
}
