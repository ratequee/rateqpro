"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function AppearanceSettings() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(next: AppLocale) {
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-base font-semibold">{t("appearance")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("themeHint")}</p>
      </div>
      <div className="space-y-2">
        <Label>{tCommon("theme")}</Label>
        <div className="flex flex-wrap gap-2">
          {(["light", "dark", "system"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={theme === value ? "default" : "outline"}
              onClick={() => setTheme(value)}
            >
              {tCommon(value)}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>{tCommon("language")}</Label>
        <p className="text-sm text-muted-foreground">{t("languageHint")}</p>
        <div className="flex flex-wrap gap-2">
          {routing.locales.map((item) => (
            <Button
              key={item}
              type="button"
              variant={locale === item ? "gold" : "outline"}
              onClick={() => switchLocale(item)}
            >
              {item === "ar" ? tCommon("arabic") : tCommon("english")}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
