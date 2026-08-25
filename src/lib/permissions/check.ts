import type { UserRole } from "@prisma/client";
import {
  PERMISSION_CATALOG,
  type PermissionAction,
  type PermissionKey,
  type PermissionModule,
} from "./catalog";

const managerDenied: PermissionKey[] = [
  "users.create",
  "users.delete",
  "roles.edit",
  "settings.edit",
  "transactions.delete",
  "payroll.delete",
];

const employeeAllowed: PermissionKey[] = [
  "dashboard.view",
  "transactions.view",
  "projects.view",
  "contracts.view",
  "expenses.view",
  "expenses.create",
  "operatingExpenses.view",
  "cashAdvances.view",
  "cashAdvances.create",
  "creditCards.view",
  "employees.view",
  "payroll.view",
  "assets.view",
  "cashFlow.view",
  "obligations.view",
  "reports.view",
  "notifications.view",
  "settings.view",
];

function catalogKeys(): PermissionKey[] {
  return PERMISSION_CATALOG.map((item) => item.key);
}

export function permissionsForRole(role: UserRole): PermissionKey[] {
  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return catalogKeys();
  }
  if (role === "MANAGER") {
    return catalogKeys().filter((key) => !managerDenied.includes(key));
  }
  return employeeAllowed;
}

export function hasPermission(
  role: UserRole,
  module: PermissionModule,
  action: PermissionAction,
): boolean {
  if (role === "SUPER_ADMIN") {
    return true;
  }
  const key = `${module}.${action}` as PermissionKey;
  return permissionsForRole(role).includes(key);
}

export function assertPermission(
  role: UserRole,
  module: PermissionModule,
  action: PermissionAction,
): void {
  if (!hasPermission(role, module, action)) {
    throw new Error("FORBIDDEN");
  }
}
