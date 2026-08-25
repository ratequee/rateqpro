"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  updateCompanySettings,
  type SettingsState,
} from "@/features/settings/actions";

const initial: SettingsState = {};

export function CompanySettingsForm({
  company,
}: {
  company: {
    name: string;
    email: string | null;
    phone: string | null;
    currencyCode: string;
    dateFormat: string;
    isDemo: boolean;
  };
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [state, formAction, pending] = useActionState(
    updateCompanySettings,
    initial,
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">{t("general")}</h2>
        {company.isDemo ? <Badge variant="gold">{t("demoBadge")}</Badge> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">{t("companyName")}</Label>
        <Input id="name" name="name" required defaultValue={company.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("contact")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={company.email ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">{t("contact")}</Label>
        <Input id="phone" name="phone" defaultValue={company.phone ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currency">{t("currency")}</Label>
        <Input
          id="currency"
          name="currency"
          value={company.currencyCode}
          readOnly
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dateFormat">{t("dateFormat")}</Label>
        <select
          id="dateFormat"
          name="dateFormat"
          defaultValue={company.dateFormat}
          className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
        >
          <option value="dd/MM/yyyy">dd/MM/yyyy</option>
          <option value="MM/dd/yyyy">MM/dd/yyyy</option>
          <option value="yyyy-MM-dd">yyyy-MM-dd</option>
        </select>
      </div>
      {state.ok ? (
        <p className="text-sm text-success">{t("saved")}</p>
      ) : null}
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {t("saveError")}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {tCommon("save")}
      </Button>
    </form>
  );
}
