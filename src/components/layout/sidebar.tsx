"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/brand/logo";
import { navigation } from "./nav-config";
import { cn } from "@/lib/utils";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center">
          <BrandLogo className="h-8 w-auto" />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigation.map((group) => (
          <div key={group.key} className="mb-5">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t(group.key)}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium",
                        active
                          ? "bg-brand-50 text-brand-700 dark:bg-dm-hover dark:text-gold-300"
                          : "text-sidebar-foreground/80 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{t(item.key)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
