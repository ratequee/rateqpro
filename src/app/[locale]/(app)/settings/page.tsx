import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { getCompanySettings } from "@/features/settings/actions";
import { hasPermission } from "@/lib/permissions/check";
import { PageHeader } from "@/components/ui/page-header";
import { CompanySettingsForm } from "@/features/settings/company-form";
import { AppearanceSettings } from "@/features/settings/appearance-settings";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function SettingsPage() {
  const user = await requirePermission("settings", "view");
  const t = await getTranslations("settings");
  const company = await getCompanySettings();
  if (!company) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
    return null;
  }

  const canEdit = hasPermission(user.role, "settings", "edit");

  return (
    <div className="space-y-10">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {canEdit ? (
        <CompanySettingsForm company={company} />
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
          {company.name} · {company.currencyCode}
        </div>
      )}
      <AppearanceSettings />
    </div>
  );
}
