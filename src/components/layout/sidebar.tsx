"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/brand/mark";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { navigation } from "./nav-config";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/auth/current-user";

export function Sidebar({
  user,
  alertCount = 0,
  onNavigate,
}: {
  user: CurrentUser;
  alertCount?: number;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const tUsers = useTranslations("users");
  const tCommon = useTranslations("common");
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-linear-to-b from-primary-deep to-primary">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-3.5 py-4">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <BrandMark />
          <div>
            <div className="text-[14.5px] font-bold leading-tight text-white">
              RateQ Pro
            </div>
            <div className="text-[10px] text-white/45">{user.companyName}</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navigation.map((group) => (
          <div key={group.key} className="mb-1">
            <p className="px-2 pt-2.5 pb-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-white/33">
              {t(group.key)}
            </p>
            <ul>
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
                        "mb-px flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-white/60 transition",
                        active
                          ? "bg-white/16 font-bold text-white shadow-[inset_-3px_0_0_#fdd663] rtl:shadow-[inset_3px_0_0_#fdd663]"
                          : "hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="flex-1">{t(item.key)}</span>
                      {item.badge && alertCount > 0 ? (
                        <span className="min-w-5 rounded-full bg-gold-bright px-1.5 py-0.5 text-center text-[9px] font-bold text-[#5a3500]">
                          {alertCount}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-2.5 border-t border-white/10 px-3.5 py-3">
        <InitialsAvatar name={user.name} tone="gold" size="sm" className="size-8 text-sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-white">{user.name}</div>
          <div className="text-[10px] text-white/40">{tUsers(`roles.${user.role}`)}</div>
        </div>
        <button
          type="button"
          className="p-1 text-[17px] text-white/35 transition hover:text-white"
          aria-label={tCommon("signOut")}
          onClick={() => {
            void logoutAction();
          }}
        >
          <LogOut className="size-[17px]" />
        </button>
      </div>
    </div>
  );
}
