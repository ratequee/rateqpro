export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "approve",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_MODULES = [
  "dashboard",
  "approvals",
  "transactions",
  "projects",
  "contracts",
  "expenses",
  "operatingExpenses",
  "cashAdvances",
  "creditCards",
  "bankAccounts",
  "bankReader",
  "employees",
  "payroll",
  "assets",
  "cashFlow",
  "obligations",
  "tax",
  "clients",
  "documents",
  "reports",
  "notifications",
  "users",
  "roles",
  "settings",
  "auditLog",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export type PermissionKey = `${PermissionModule}.${PermissionAction}`;

export type PermissionDefinition = {
  module: PermissionModule;
  action: PermissionAction;
  key: PermissionKey;
};

const moduleActions: Record<PermissionModule, PermissionAction[]> = {
  dashboard: ["view"],
  approvals: ["view", "approve"],
  transactions: ["view", "create", "edit", "delete", "export", "approve"],
  projects: ["view", "create", "edit", "delete", "export"],
  contracts: ["view", "create", "edit", "delete", "export"],
  expenses: ["view", "create", "edit", "delete", "export"],
  operatingExpenses: ["view", "create", "edit", "delete", "export"],
  cashAdvances: ["view", "create", "edit", "delete", "export", "approve"],
  creditCards: ["view", "create", "edit", "delete", "export"],
  bankAccounts: ["view", "create", "edit", "delete"],
  bankReader: ["view", "create"],
  employees: ["view", "create", "edit", "delete", "export"],
  payroll: ["view", "create", "edit", "delete", "export", "approve"],
  assets: ["view", "create", "edit", "delete", "export"],
  cashFlow: ["view", "export"],
  obligations: ["view", "create", "edit", "delete", "export"],
  tax: ["view"],
  clients: ["view", "create", "edit", "delete"],
  documents: ["view", "create", "edit", "delete"],
  reports: ["view", "export"],
  notifications: ["view", "edit"],
  users: ["view", "create", "edit", "delete"],
  roles: ["view", "edit"],
  settings: ["view", "edit"],
  auditLog: ["view", "export"],
};

export const PERMISSION_CATALOG: PermissionDefinition[] = (
  Object.entries(moduleActions) as [PermissionModule, PermissionAction[]][]
).flatMap(([module, actions]) =>
  actions.map((action) => ({
    module,
    action,
    key: `${module}.${action}` as PermissionKey,
  })),
);

export function permissionKey(
  module: PermissionModule,
  action: PermissionAction,
): PermissionKey {
  return `${module}.${action}`;
}
