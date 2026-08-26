"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function AppearanceSettings() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const { theme, setTheme } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <div className="text-[13px] font-medium">{tCommon("theme")}</div>
        <div className="text-[11px] text-muted-foreground">{t("themeHint")}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["light", "dark", "system"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={ready && theme === value ? "default" : "outline"}
            onClick={() => setTheme(value)}
          >
            {tCommon(value)}
          </Button>
        ))}
      </div>
    </div>
  );
}
