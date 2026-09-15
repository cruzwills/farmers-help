export const ROLES = ["Admin", "Manager", "Staff"];

export const ROLE_META = {
  Admin: { color: "#1F4D2C", soft: "#E7F0E4", description: "Full access — users, catalogue, stock, reports." },
  Manager: { color: "#B8790E", soft: "#FCF0DA", description: "Manage products, batches and stock. No user management." },
  Staff: { color: "#5B5A4A", soft: "#EDEAE0", description: "Log stock in/out only. Read-only elsewhere." },
};

// Single source of truth for what each role can do.
const ROLE_PERMISSIONS = {
  Admin: ["manageUsers", "manageProducts", "manageBatches", "stockMovement", "viewReports"],
  Manager: ["manageProducts", "manageBatches", "stockMovement", "viewReports"],
  Staff: ["stockMovement"],
};

export function hasPermission(role, permission) {
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}
