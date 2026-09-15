import { ThemeProvider, CssBaseline } from "@mui/material";
import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from "react-router-dom";
import theme from "./theme";
import { InventoryProvider } from "./context/InventoryContext";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./screens/Dashboard";
import InventoryList from "./screens/InventoryList";
import ProductDetail from "./screens/ProductDetail";
import Alerts from "./screens/Alerts";
import ActivityLog from "./screens/ActivityLog";
import Settings from "./screens/Settings";
import ReportsHome from "./screens/reports/ReportsHome";
import StockValuationReport from "./screens/reports/StockValuationReport";
import MovementsReport from "./screens/reports/MovementsReport";
import ExpiryReport from "./screens/reports/ExpiryReport";
import ReorderReport from "./screens/reports/ReorderReport";
import AdjustmentsReport from "./screens/reports/AdjustmentsReport";
import SetPassword from "./screens/SetPassword";
import Login from "./screens/Login";
import NotFound from "./screens/NotFound";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<Login />} errorElement={<NotFound />} />
      <Route path="/activate/:token" element={<SetPassword />} errorElement={<NotFound />} />
      <Route path="/" element={<AppShell />} errorElement={<NotFound />}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<InventoryList />} />
        <Route path="inventory/:id" element={<ProductDetail />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="activity" element={<ActivityLog />} />
        <Route path="settings" element={<Settings />} />
        <Route path="reports" element={<ReportsHome />} />
        <Route path="reports/valuation" element={<StockValuationReport />} />
        <Route path="reports/movements" element={<MovementsReport />} />
        <Route path="reports/expiry" element={<ExpiryReport />} />
        <Route path="reports/reorder" element={<ReorderReport />} />
        <Route path="reports/adjustments" element={<AdjustmentsReport />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </>
  )
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <InventoryProvider>
        <RouterProvider router={router} />
      </InventoryProvider>
    </ThemeProvider>
  );
}

export default App;
