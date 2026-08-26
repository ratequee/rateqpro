import {
  LayoutDashboard,
  CheckCheck,
  Landmark,
  FileSpreadsheet,
  Receipt,
  ListChecks,
  TrendingUp,
  Calculator,
  Contact,
  ClipboardList,
  Users,
  Files,
  Package,
  PieChart,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItemKey =
  | "dashboard"
  | "approvals"
  | "bankAccounts"
  | "bankReader"
  | "expenses"
  | "obligations"
  | "cashFlow"
  | "tax"
  | "clients"
  | "projects"
  | "employees"
  | "documents"
  | "assets"
  | "reports"
  | "settings";

export type NavItem = {
  href: string;
  key: NavItemKey;
  icon: LucideIcon;
  badge?: boolean;
};

export type NavGroup = {
  key: "main" | "finance" | "business" | "reportsSection";
  items: NavItem[];
};

export const navigation: NavGroup[] = [
  {
    key: "main",
    items: [
      { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
      { href: "/approvals", key: "approvals", icon: CheckCheck, badge: true },
    ],
  },
  {
    key: "finance",
    items: [
      { href: "/bank-accounts", key: "bankAccounts", icon: Landmark },
      { href: "/bank-reader", key: "bankReader", icon: FileSpreadsheet },
      { href: "/transactions", key: "expenses", icon: Receipt },
      { href: "/obligations", key: "obligations", icon: ListChecks },
      { href: "/cash-flow", key: "cashFlow", icon: TrendingUp },
      { href: "/tax", key: "tax", icon: Calculator },
    ],
  },
  {
    key: "business",
    items: [
      { href: "/clients", key: "clients", icon: Contact },
      { href: "/projects", key: "projects", icon: ClipboardList },
      { href: "/employees", key: "employees", icon: Users },
      { href: "/documents", key: "documents", icon: Files },
      { href: "/assets", key: "assets", icon: Package },
    ],
  },
  {
    key: "reportsSection",
    items: [
      { href: "/reports", key: "reports", icon: PieChart },
      { href: "/settings", key: "settings", icon: Settings },
    ],
  },
];

const extraTitles: Array<{ href: string; key: NavItemKey }> = [
  { href: "/notifications", key: "approvals" },
  { href: "/credit-cards", key: "bankAccounts" },
  { href: "/contracts", key: "projects" },
  { href: "/payroll", key: "employees" },
  { href: "/cash-advances", key: "assets" },
  { href: "/users", key: "settings" },
  { href: "/roles", key: "settings" },
  { href: "/audit-log", key: "settings" },
];

export function navTitleKey(pathname: string): NavItemKey {
  const items = [
    ...navigation.flatMap((group) => group.items),
    ...extraTitles,
  ];
  const match = items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.key ?? "dashboard";
}
