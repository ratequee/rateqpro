"use client";

import { Bell, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { Link, usePathname } from "@/i18n/navigation";
import { Sidebar } from "./sidebar";
import { navTitleKey } from "./nav-config";
import { logoutAction } from "@/features/auth/actions";
import { getFirstName } from "@/lib/formatting/initials";
import type { CurrentUser } from "@/lib/auth/current-user";

export function AppHeader({
  user,
  alertCount = 0,
}: {
  user: CurrentUser;
  alertCount?: number;
}) {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const tUsers = useTranslations("users");
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const titleKey = navTitleKey(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-[54px] items-center justify-between border-b border-border bg-card px-5 shadow-[0_1px_0_var(--border)]">
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("openMenu")}>
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="start" className="border-0 bg-transparent p-0">
            <SheetTitle className="sr-only">{tNav("dashboard")}</SheetTitle>
            <Sidebar
              user={user}
              alertCount={alertCount}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <p className="text-[15px] font-bold">{tNav(titleKey)}</p>
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitch />
        <Button
          variant="outline"
          size="icon"
          className="size-[35px]"
          aria-label={t("theme")}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 dark:hidden" />
          <Moon className="hidden size-4 dark:block" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="relative size-[35px]"
          aria-label={t("notifications")}
          asChild
        >
          <Link href="/approvals">
            <Bell className="size-4" />
            {alertCount > 0 ? (
              <span className="absolute -start-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full border-2 border-white bg-destructive text-[9px] font-bold text-white">
                {alertCount}
              </span>
            ) : null}
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-border bg-muted py-1 pe-2.5 ps-1 text-xs font-semibold"
            >
              <InitialsAvatar name={user.name} tone="solid" size="sm" />
              <span className="hidden max-w-36 truncate sm:inline">
                {getFirstName(user.name)} · {tUsers(`roles.${user.role}`)}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {t("signedInAs")}
              <div className="truncate font-medium text-foreground">{user.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void logoutAction();
              }}
            >
              <LogOut className="size-4" />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
