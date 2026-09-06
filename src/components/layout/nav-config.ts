import {
  LayoutDashboard,
  CheckCheck,
  Bell,
  Landmark,
  FileSpreadsheet,
  Receipt,
  ListChecks,
  TrendingUp,
  Calculator,
  Wallet,
  Contact,
  ClipboardList,
  Users,
  Files,
  Package,
  PieChart,
  Shield,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItemKey =
  | "dashboard"
  | "approvals"
  | "alerts"
  | "bankAccounts"
  | "bankReader"
  | "expenses"
  | "obligations"
  | "cashFlow"
  | "tax"
  | "salary"
  | "clients"
  | "projects"
  | "employees"
  | "documents"
  | "assets"
  | "reports"
  | "team"
  | "settings";

export type NavItem = {
  href: string;
  key: NavItemKey;
  icon: LucideIcon;
  badge?: "approvals" | "alerts";
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
      { href: "/approvals", key: "approvals", icon: CheckCheck, badge: "approvals" },
      { href: "/notifications", key: "alerts", icon: Bell, badge: "alerts" },
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
      { href: "/salary", key: "salary", icon: Wallet },
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
      { href: "/team", key: "team", icon: Shield },
      { href: "/settings", key: "settings", icon: Settings },
    ],
  },
];

const extraTitles: Array<{ href: string; key: NavItemKey }> = [
  { href: "/credit-cards", key: "bankAccounts" },
  { href: "/contracts", key: "projects" },
  { href: "/payroll", key: "salary" },
  { href: "/operating-expenses", key: "expenses" },
  { href: "/project-expenses", key: "expenses" },
  { href: "/cash-advances", key: "assets" },
  { href: "/users", key: "team" },
  { href: "/roles", key: "team" },
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
