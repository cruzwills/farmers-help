import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { hasPermission } from "../utils/permissions";

const InventoryStateContext = createContext(null);
const InventoryDispatchContext = createContext(null);

const EMPTY_STATE = { products: [], movements: [], users: [], outbox: [] };

export function InventoryProvider({ children }) {
  const [status, setStatus] = useState("loading"); // loading | signed-out | ready
  const [currentUser, setCurrentUser] = useState(null);
  const [data, setData] = useState(EMPTY_STATE);
  const [error, setError] = useState("");

  const refreshInventory = useCallback(async () => {
    const [{ products }, { movements }] = await Promise.all([api.products(), api.movements()]);
    setData((d) => ({ ...d, products, movements }));
  }, []);

  const refreshUsers = useCallback(async (user) => {
    const { users } = await api.users();
    let outbox = [];
    if (hasPermission(user?.role, "manageUsers")) {
      try {
        outbox = (await api.outbox()).outbox;
      } catch {
        outbox = [];
      }
    }
    setData((d) => ({ ...d, users, outbox }));
  }, []);

  const loadEverything = useCallback(
    async (user) => {
      await Promise.all([refreshInventory(), refreshUsers(user)]);
    },
    [refreshInventory, refreshUsers]
  );

  // bootstrap once on load: are we already signed in (a valid session cookie)?
  useEffect(() => {
    (async () => {
      try {
        const { user } = await api.me();
        if (user) {
          setCurrentUser(user);
          await loadEverything(user);
          setStatus("ready");
        } else {
          setStatus("signed-out");
        }
      } catch {
        setStatus("signed-out");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // wraps a mutating action: runs it, refreshes the relevant slice of
  // state from the server (source of truth), and surfaces any failure
  // both as a global toast and back to the caller (so a specific screen
  // can react too, e.g. keep a dialog open)
  const runAction = useCallback((fn, refresh) => {
    return async (...args) => {
      try {
        const result = await fn(...args);
        if (refresh) await refresh();
        return result;
      } catch (err) {
        setError(err.message || "Something went wrong.");
        throw err;
      }
    };
  }, []);

  const actions = useMemo(
    () => ({
      login: async (identifier, password) => {
        try {
          const { user } = await api.login(identifier, password);
          setCurrentUser(user);
          await loadEverything(user);
          setStatus("ready");
          return user;
        } catch (err) {
          throw err; // Login screen shows this inline — no global toast for bad credentials
        }
      },
      logout: async () => {
        try {
          await api.logout();
        } finally {
          setCurrentUser(null);
          setData(EMPTY_STATE);
          setStatus("signed-out");
        }
      },
      activateUser: async ({ token, password }) => {
        const { user } = await api.activate(token, password);
        setCurrentUser(user);
        await loadEverything(user);
        setStatus("ready");
        return user;
      },

      stockIn: runAction(({ productId, ...payload }) => api.stockIn(productId, payload), refreshInventory),
      stockOut: runAction(({ productId, ...payload }) => api.stockOut(productId, payload), refreshInventory),
      addProduct: runAction((payload) => api.addProduct(payload), refreshInventory),
      bulkImport: runAction((payload) => api.bulkImport(payload), refreshInventory),
      updateProduct: runAction(({ productId, updates }) => api.updateProduct(productId, updates), refreshInventory),
      deleteProduct: runAction(({ productId }) => api.deleteProduct(productId), refreshInventory),
      updateBatch: runAction(
        ({ productId, originalBatchNo, batch }) => api.updateBatch(productId, originalBatchNo, batch),
        refreshInventory
      ),
      deleteBatch: runAction(({ productId, batchNo }) => api.deleteBatch(productId, batchNo), refreshInventory),

      addUser: runAction((payload) => api.addUser(payload), () => refreshUsers(currentUser)),
      updateUser: runAction(
        ({ userId, updates }) => api.updateUser(userId, updates),
        () => refreshUsers(currentUser)
      ),
      deleteUser: runAction(({ userId }) => api.deleteUser(userId), () => refreshUsers(currentUser)),
      resendInvite: runAction(({ userId }) => api.resendInvite(userId), () => refreshUsers(currentUser)),
    }),
    [runAction, refreshInventory, refreshUsers, currentUser, loadEverything]
  );

  const state = useMemo(
    () => ({ ...data, status, error, clearError: () => setError("") }),
    [data, status, error]
  );

  return (
    <InventoryStateContext.Provider value={{ state, currentUser }}>
      <InventoryDispatchContext.Provider value={actions}>{children}</InventoryDispatchContext.Provider>
    </InventoryStateContext.Provider>
  );
}

export function useInventoryState() {
  const ctx = useContext(InventoryStateContext);
  if (!ctx) throw new Error("useInventoryState must be used within InventoryProvider");
  return ctx.state;
}

export function useInventoryActions() {
  const ctx = useContext(InventoryDispatchContext);
  if (!ctx) throw new Error("useInventoryActions must be used within InventoryProvider");
  return ctx;
}

export function useProduct(productId) {
  const { products } = useInventoryState();
  return products.find((p) => p.id === productId);
}

export function useCurrentUser() {
  const ctx = useContext(InventoryStateContext);
  if (!ctx) throw new Error("useCurrentUser must be used within InventoryProvider");
  return ctx.currentUser;
}

export function usePermission(permission) {
  const currentUser = useCurrentUser();
  return hasPermission(currentUser?.role, permission);
}
