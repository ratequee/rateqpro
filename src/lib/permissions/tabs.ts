import type { PermissionModule } from "./catalog";
import type { NavItemKey } from "@/components/layout/nav-config";

export type TabPermission = {
  module: PermissionModule;
  navKey?: NavItemKey;
};

export const TAB_PERMISSIONS: Array<{
  module: PermissionModule;
  navKey?: NavItemKey;
}> = [
  { module: "dashboard", navKey: "dashboard" },
  { module: "approvals", navKey: "approvals" },
  { module: "notifications", navKey: "alerts" },
  { module: "bankAccounts", navKey: "bankAccounts" },
  { module: "creditCards", navKey: "bankAccounts" },
  { module: "bankReader", navKey: "bankReader" },
  { module: "transactions", navKey: "expenses" },
  { module: "expenses", navKey: "expenses" },
  { module: "operatingExpenses", navKey: "expenses" },
  { module: "obligations", navKey: "obligations" },
  { module: "cashFlow", navKey: "cashFlow" },
  { module: "tax", navKey: "tax" },
  { module: "payroll", navKey: "salary" },
  { module: "clients", navKey: "clients" },
  { module: "projects", navKey: "projects" },
  { module: "contracts", navKey: "projects" },
  { module: "employees", navKey: "employees" },
  { module: "documents", navKey: "documents" },
  { module: "assets", navKey: "assets" },
  { module: "cashAdvances", navKey: "assets" },
  { module: "reports", navKey: "reports" },
  { module: "users", navKey: "team" },
  { module: "roles", navKey: "team" },
  { module: "settings", navKey: "settings" },
  { module: "auditLog", navKey: "settings" },
];

export const NAV_VIEW_MODULE: Record<NavItemKey, PermissionModule> = {
  dashboard: "dashboard",
  approvals: "approvals",
  alerts: "notifications",
  bankAccounts: "bankAccounts",
  bankReader: "bankReader",
  expenses: "transactions",
  obligations: "obligations",
  cashFlow: "cashFlow",
  tax: "tax",
  salary: "payroll",
  clients: "clients",
  projects: "projects",
  employees: "employees",
  documents: "documents",
  assets: "assets",
  reports: "reports",
  team: "users",
  settings: "settings",
};
