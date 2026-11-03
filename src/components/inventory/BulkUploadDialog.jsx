import { forwardRef, useRef, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  IconButton,
  LinearProgress,
  Slide,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import { useInventoryActions, useInventoryState } from "../../context/InventoryContext";
import { BulkFileError, downloadTemplate, parseWorkbookFile, toImportPayloadRows, validateRows } from "../../utils/bulkImport";
import { formatDate } from "../../utils/inventoryHelpers";
import { brand } from "../../theme";

// keeps the preview responsive on a phone; problem rows always come first
const MAX_PREVIEW_ROWS = 200;

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function BulkUploadDialog({ open, onClose }) {
  const fullScreen = useMediaQuery("(max-width:600px)");
  const { products } = useInventoryState();
  const { bulkImport } = useInventoryActions();
  const fileInputRef = useRef(null);

  const [stage, setStage] = useState("idle"); // idle | loading | preview | importing | done | fileError
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [fileError, setFileError] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const [importError, setImportError] = useState("");
  const [duplicateNotice, setDuplicateNotice] = useState("");

  const reset = () => {
    setStage("idle");
    setFileName("");
    setRows([]);
    setFileError("");
    setImportError("");
    setDuplicateNotice("");
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (stage === "importing") return; // the save is still running
    reset();
    onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStage("loading");
    try {
      const rawRows = await parseWorkbookFile(file);
      if (rawRows.length === 0) {
        setFileError("That file has no rows to import. Check it matches the template.");
        setStage("fileError");
        return;
      }
      const validated = validateRows(rawRows, products);
      setRows(validated);
      setStage("preview");
    } catch (err) {
      setFileError(
        err instanceof BulkFileError
          ? err.message
          : "Couldn't read that file. Make sure it's a .xlsx, .xls, or .csv file matching the template, and isn't password-protected."
      );
      setStage("fileError");
    }
  };

  const validRows = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);
  const warningRows = validRows.filter((r) => r.warnings.length > 0);
  const previewRows = [...invalidRows, ...warningRows, ...validRows.filter((r) => r.warnings.length === 0)];

  const handleImport = async (confirmDuplicate = false) => {
    setStage("importing");
    setImportError("");
    setDuplicateNotice("");
    try {
      const result = await bulkImport({ rows: toImportPayloadRows(rows), fileName, confirmDuplicate });
      setImportSummary({ total: result.total, newProducts: result.created, restocks: result.restocked });
      setStage("done");
    } catch (err) {
      if (err.reason === "duplicate-import") {
        setDuplicateNotice(err.message);
      } else if (err.status >= 400 && err.status < 500) {
        setImportError(err.message);
      } else {
        // no clear answer from the server: the save may or may not have finished
        setImportError(
          "Couldn't confirm the upload finished. Check your connection, then press Import again — if it did save, you'll be warned rather than adding the stock twice."
        );
      }
      setStage("preview");
    }
  };

  return (
    <Dialog
      fullScreen={fullScreen}
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : "18px" } }}
    >
      <AppBar position="relative" sx={{ backgroundColor: brand.primaryDark }} elevation={0}>
        <Toolbar>
          <Typography sx={{ flex: 1, fontWeight: 800 }}>Bulk Upload Stock</Typography>
          <IconButton edge="end" onClick={handleClose} disabled={stage === "importing"} sx={{ color: "#fff" }} aria-label="close">
            <CloseRoundedIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2, minWidth: { sm: 480 } }}>
        {(stage === "idle" || stage === "fileError") && (
          <>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Upload an Excel file to add or restock many products at once. Each row is one batch — a
              brand-new product needs its details filled in on its first row only; extra batches for it (or
              restocks of an existing product) just need the batch number, dates and quantity. Enter any
              category and unit of measurement in the first row for each new product. Write dates as
              day/month/year or YYYY-MM-DD.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<FileDownloadRoundedIcon />}
              onClick={() => downloadTemplate(products)}
              sx={{ borderColor: "divider", color: "text.primary" }}
            >
              Download template (.xlsx)
            </Button>
            {fileError && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, borderRadius: "12px", backgroundColor: "#FBE4E4" }}>
                <ErrorOutlineRoundedIcon sx={{ color: brand.danger }} fontSize="small" />
                <Typography variant="body2" sx={{ color: brand.danger, fontWeight: 700 }}>
                  {fileError}
                </Typography>
              </Box>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleFileChange}
              hidden
              id="bulk-upload-file-input"
            />
            <Button
              variant="contained"
              size="large"
              startIcon={<UploadFileRoundedIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Excel file
            </Button>
          </>
        )}

        {stage === "loading" && (
          <Box sx={{ py: 4, display: "flex", flexDirection: "column", gap: 1.5, alignItems: "center" }}>
            <LinearProgress sx={{ width: "100%", borderRadius: 5 }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Reading {fileName}…
            </Typography>
          </Box>
        )}

        {stage === "preview" && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, borderRadius: "12px", backgroundColor: "background.default" }}>
              <DescriptionRoundedIcon sx={{ color: "text.secondary" }} fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }} noWrap>
                {fileName}
              </Typography>
              <Chip
                size="small"
                label={`${validRows.length} ready`}
                sx={{ fontWeight: 800, backgroundColor: "#E7F0E4", color: brand.primaryDark }}
              />
              {warningRows.length > 0 && (
                <Chip
                  size="small"
                  label={`${warningRows.length} to check`}
                  sx={{ fontWeight: 800, backgroundColor: "#FCF0DA", color: "#8A5A08" }}
                />
              )}
              {invalidRows.length > 0 && (
                <Chip
                  size="small"
                  label={`${invalidRows.length} error${invalidRows.length !== 1 ? "s" : ""}`}
                  sx={{ fontWeight: 800, backgroundColor: "#FBE4E4", color: brand.danger }}
                />
              )}
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 340, overflowY: "auto" }}>
              {previewRows.slice(0, MAX_PREVIEW_ROWS).map((row) => (
                <Card
                  key={row.rowNumber}
                  sx={{
                    p: 1.5,
                    flexShrink: 0, // scroll the list; never clip a row's errors
                    borderColor: row.valid ? "divider" : `${brand.danger}55`,
                    backgroundColor: row.valid ? "background.paper" : "#FBE4E4",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    {row.valid ? (
                      <CheckCircleRoundedIcon sx={{ color: brand.primaryDark, fontSize: 20, mt: 0.2 }} />
                    ) : (
                      <ErrorOutlineRoundedIcon sx={{ color: brand.danger, fontSize: 20, mt: 0.2 }} />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                        ROW {row.rowNumber} {row.isNewProduct && row.valid ? "· NEW PRODUCT" : ""}
                      </Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }}>{row.name || "(no product name)"}</Typography>
                      {row.valid ? (
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          Batch {row.batchNo} · {row.qty} {row.unit} · expires {formatDate(row.expiryDate)}
                        </Typography>
                      ) : (
                        <Box component="ul" sx={{ m: 0, pl: 2.2, color: brand.danger }}>
                          {row.errors.map((err) => (
                            <Typography key={err} component="li" variant="body2" sx={{ color: brand.danger }}>
                              {err}
                            </Typography>
                          ))}
                        </Box>
                      )}
                      {row.valid &&
                        row.warnings.map((warning) => (
                          <Typography key={warning} variant="body2" sx={{ color: "#8A5A08", fontWeight: 600, mt: 0.25 }}>
                            {warning}
                          </Typography>
                        ))}
                    </Box>
                  </Box>
                </Card>
              ))}
              {previewRows.length > MAX_PREVIEW_ROWS && (
                <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 1 }}>
                  …and {previewRows.length - MAX_PREVIEW_ROWS} more rows with nothing to check.
                </Typography>
              )}
            </Box>

            {invalidRows.length > 0 && (
              <Typography variant="body2" sx={{ color: brand.danger, fontWeight: 700 }}>
                Nothing is saved until every row is right. Fix {invalidRows.length === 1 ? "this row" : `these ${invalidRows.length} rows`} in your
                file, then upload it again.
              </Typography>
            )}

            {duplicateNotice && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, p: 1.5, borderRadius: "12px", backgroundColor: "#FCF0DA" }}>
                <Typography variant="body2" sx={{ color: "#8A5A08", fontWeight: 700 }}>
                  {duplicateNotice}
                </Typography>
                <Button variant="outlined" color="warning" onClick={() => handleImport(true)}>
                  This is new stock — import again
                </Button>
              </Box>
            )}

            {importError && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, borderRadius: "12px", backgroundColor: "#FBE4E4" }}>
                <ErrorOutlineRoundedIcon sx={{ color: brand.danger }} fontSize="small" />
                <Typography variant="body2" sx={{ color: brand.danger, fontWeight: 700 }}>
                  {importError}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: "flex", gap: 1.25, mt: 0.5 }}>
              <Button fullWidth variant="outlined" onClick={reset} sx={{ borderColor: "divider", color: "text.primary" }}>
                Choose different file
              </Button>
              <Button fullWidth variant="contained" disabled={invalidRows.length > 0 || Boolean(duplicateNotice)} onClick={() => handleImport()}>
                Import {rows.length} row{rows.length !== 1 ? "s" : ""}
              </Button>
            </Box>
          </>
        )}

        {stage === "importing" && (
          <Box sx={{ py: 4, display: "flex", flexDirection: "column", gap: 1.5, alignItems: "center" }}>
            <LinearProgress sx={{ width: "100%", borderRadius: 5 }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Saving {validRows.length} row{validRows.length !== 1 ? "s" : ""}…
            </Typography>
          </Box>
        )}

        {stage === "done" && importSummary && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, py: 3 }}>
            <CheckCircleRoundedIcon sx={{ fontSize: 44, color: brand.primaryDark }} />
            <Typography variant="h6" sx={{ fontWeight: 900, textAlign: "center" }}>
              Imported {importSummary.total} row{importSummary.total !== 1 ? "s" : ""}
            </Typography>
            <Typography sx={{ color: "text.secondary", textAlign: "center" }}>
              {importSummary.newProducts} new product{importSummary.newProducts !== 1 ? "s" : ""} created ·{" "}
              {importSummary.restocks} row{importSummary.restocks !== 1 ? "s" : ""} added to existing products.
            </Typography>
            <Button variant="contained" size="large" onClick={handleClose} sx={{ mt: 1 }}>
              Done
            </Button>
          </Box>
        )}
      </Box>
    </Dialog>
  );
}
