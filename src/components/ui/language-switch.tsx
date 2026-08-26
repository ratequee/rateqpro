"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(next: AppLocale) {
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-lg border border-border bg-muted",
        className,
      )}
    >
      {routing.locales.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => switchLocale(item)}
          className={cn(
            "px-3 py-[5px] text-[11px] font-semibold transition",
            locale === item
              ? "bg-primary text-white"
              : "bg-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {item === "ar" ? "عربي" : "EN"}
        </button>
      ))}
    </div>
  );
}
