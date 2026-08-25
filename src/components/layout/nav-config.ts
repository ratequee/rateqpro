import {
  LayoutDashboard,
  ArrowLeftRight,
  FolderKanban,
  FileText,
  HardHat,
  Building2,
  Wallet,
  CreditCard,
  Users,
  Banknote,
  Boxes,
  TrendingUp,
  CalendarClock,
  PieChart,
  Bell,
  Shield,
  Settings,
  ScrollText,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  key:
    | "dashboard"
    | "transactions"
    | "projects"
    | "contracts"
    | "projectExpenses"
    | "operatingExpenses"
    | "cashAdvances"
    | "creditCards"
    | "employees"
    | "payroll"
    | "assets"
    | "cashFlow"
    | "obligations"
    | "reports"
    | "notifications"
    | "users"
    | "roles"
    | "settings"
    | "auditLog";
  icon: LucideIcon;
};

export type NavGroup = {
  key: "overview" | "finance" | "operations" | "people" | "system";
  items: NavItem[];
};

export const navigation: NavGroup[] = [
  {
    key: "overview",
    items: [{ href: "/dashboard", key: "dashboard", icon: LayoutDashboard }],
  },
  {
    key: "finance",
    items: [
      { href: "/transactions", key: "transactions", icon: ArrowLeftRight },
      { href: "/cash-flow", key: "cashFlow", icon: TrendingUp },
      { href: "/obligations", key: "obligations", icon: CalendarClock },
      { href: "/reports", key: "reports", icon: PieChart },
    ],
  },
  {
    key: "operations",
    items: [
      { href: "/projects", key: "projects", icon: FolderKanban },
      { href: "/contracts", key: "contracts", icon: FileText },
      { href: "/project-expenses", key: "projectExpenses", icon: HardHat },
      { href: "/operating-expenses", key: "operatingExpenses", icon: Building2 },
      { href: "/credit-cards", key: "creditCards", icon: CreditCard },
    ],
  },
  {
    key: "people",
    items: [
      { href: "/employees", key: "employees", icon: Users },
      { href: "/payroll", key: "payroll", icon: Banknote },
      { href: "/cash-advances", key: "cashAdvances", icon: Wallet },
      { href: "/assets", key: "assets", icon: Boxes },
    ],
  },
  {
    key: "system",
    items: [
      { href: "/notifications", key: "notifications", icon: Bell },
      { href: "/users", key: "users", icon: UserCog },
      { href: "/roles", key: "roles", icon: Shield },
      { href: "/audit-log", key: "auditLog", icon: ScrollText },
      { href: "/settings", key: "settings", icon: Settings },
    ],
  },
];
