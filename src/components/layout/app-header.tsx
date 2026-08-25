"use client";

import { Bell, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { Sidebar } from "./sidebar";
import { logoutAction } from "@/features/auth/actions";
import type { CurrentUser } from "@/lib/auth/current-user";

export function AppHeader({ user }: { user: CurrentUser }) {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const { resolvedTheme, setTheme } = useTheme();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function switchLocale(next: AppLocale) {
    router.replace(pathname, { locale: next });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("openMenu")}>
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="start" className="p-0">
            <SheetTitle className="sr-only">{tNav("dashboard")}</SheetTitle>
            <Sidebar onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <p className="hidden text-sm font-semibold text-muted-foreground sm:block">
          {user.companyName}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("theme")}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 dark:hidden" />
          <Moon className="hidden size-4 dark:block" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              {locale === "ar" ? t("arabic") : t("english")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {routing.locales.map((item) => (
              <DropdownMenuItem key={item} onClick={() => switchLocale(item)}>
                {item === "ar" ? t("arabic") : t("english")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" aria-label={t("notifications")}>
          <Bell className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="max-w-40 truncate">
              {user.name}
            </Button>
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
