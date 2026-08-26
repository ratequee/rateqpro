"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Bell, Building2, Languages, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type PanelId = "language" | "company" | "users" | "alerts" | "plan";

export function SettingsShell({
  language,
  company,
  users,
  alerts,
  plan,
}: {
  language: ReactNode;
  company: ReactNode;
  users: ReactNode;
  alerts: ReactNode;
  plan: ReactNode;
}) {
  const t = useTranslations("settings");
  const [panel, setPanel] = useState<PanelId>("language");
  const panels: Record<PanelId, ReactNode> = { language, company, users, alerts, plan };

  return (
    <div className="grid gap-3.5 lg:grid-cols-[190px_1fr]">
      <nav className="h-fit rounded-[13px] border border-border bg-card py-2">
        <div className="px-3.5 pt-2 pb-1 text-[9.5px] font-bold uppercase tracking-wider text-ink-light">
          {t("general")}
        </div>
        <NavBtn id="language" active={panel} onClick={setPanel} icon={Languages} label={t("language")} />
        <NavBtn id="company" active={panel} onClick={setPanel} icon={Building2} label={t("company")} />
        <NavBtn id="users" active={panel} onClick={setPanel} icon={Users} label={t("users")} />
        <div className="px-3.5 pt-2 pb-1 text-[9.5px] font-bold uppercase tracking-wider text-ink-light">
          {t("system")}
        </div>
        <NavBtn id="alerts" active={panel} onClick={setPanel} icon={Bell} label={t("alerts")} />
        <NavBtn id="plan" active={panel} onClick={setPanel} icon={Star} label={t("subscription")} />
      </nav>
      <div className="rounded-[13px] border border-border bg-card px-[18px] py-4">{panels[panel]}</div>
    </div>
  );
}

function NavBtn({
  id,
  active,
  onClick,
  icon: Icon,
  label,
}: {
  id: PanelId;
  active: PanelId;
  onClick: (id: PanelId) => void;
  icon: typeof Languages;
  label: string;
}) {
  const on = active === id;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={cn(
        "flex w-full items-center gap-2 px-3.5 py-2.5 text-start text-[12.5px] text-muted-foreground",
        on && "border-s-[3px] border-primary bg-brand-soft font-bold text-primary",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
