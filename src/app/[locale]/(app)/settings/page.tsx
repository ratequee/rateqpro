import { getTranslations } from "next-intl/server";
import { Settings } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { getCompanySettings } from "@/features/settings/actions";
import { hasPermission } from "@/lib/permissions/check";
import { PageHeader } from "@/components/ui/page-header";
import { CompanySettingsForm } from "@/features/settings/company-form";
import { AppearanceSettings } from "@/features/settings/appearance-settings";
import { SettingsShell } from "@/features/settings/settings-shell";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { getLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { UserFormDialog } from "@/features/users/user-form";

export default async function SettingsPage() {
  const user = await requirePermission("settings", "view");
  const t = await getTranslations("settings");
  const tUsers = await getTranslations("users");
  const company = await getCompanySettings();
  if (!company) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
    return null;
  }

  const canEdit = hasPermission(user.role, "settings", "edit");
  const [users, subscription] = await Promise.all([
    prisma.user.findMany({
      where: companyScope(user.companyId),
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, status: true },
    }),
    prisma.subscription.findUnique({
      where: { companyId: user.companyId },
      include: { plan: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={Settings} />
      <SettingsShell
        language={
          <div>
            <h2 className="mb-3 flex items-center gap-1.5 border-b border-border pb-2.5 text-[13.5px] font-bold">
              {t("language")}
            </h2>
            <div className="flex items-center justify-between border-b border-muted py-2.5">
              <div>
                <div className="text-[13px] font-medium">{t("systemLanguage")}</div>
                <div className="text-[11px] text-muted-foreground">RTL / LTR</div>
              </div>
              <LanguageSwitch />
            </div>
            <AppearanceSettings />
          </div>
        }
        company={
          canEdit ? (
            <CompanySettingsForm company={company} />
          ) : (
            <div className="text-sm text-muted-foreground">
              {company.name} · {company.currencyCode}
            </div>
          )
        }
        users={
          <div>
            <h2 className="mb-3 flex items-center justify-between gap-1.5 border-b border-border pb-2.5 text-[13.5px] font-bold">
              {t("users")}
              <UserFormDialog />
            </h2>
            <div className="overflow-hidden rounded-[10px] border border-border">
              {users.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-muted px-3 py-2.5 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <InitialsAvatar name={item.name} tone="solid" size="sm" />
                    <div>
                      <div className="text-[12.5px] font-semibold">{item.name}</div>
                      <div className="text-[10px] text-ink-light">{item.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="gold">{tUsers(`roles.${item.role}`)}</Badge>
                    <span className="text-[11.5px] text-success">● {tUsers(`statuses.${item.status}`)}</span>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/users" className="mt-3 inline-block text-[11.5px] font-semibold text-primary">
              {tUsers("title")} →
            </Link>
          </div>
        }
        alerts={
          <div>
            <h2 className="mb-3 flex items-center gap-1.5 border-b border-border pb-2.5 text-[13.5px] font-bold">
              {t("alerts")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("themeHint")}</p>
          </div>
        }
        plan={
          <div>
            <h2 className="mb-3 flex items-center gap-1.5 border-b border-border pb-2.5 text-[13.5px] font-bold">
              {t("subscription")}
            </h2>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="text-xl font-bold text-primary">RateQ Pro</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {subscription?.plan.name ?? "Trial"} · {subscription?.status ?? "TRIAL"}
                </div>
              </div>
              <div className="text-end">
                <div className="text-[28px] font-bold text-primary">
                  {subscription?.plan.monthlyPrice.toString() ?? "0"} {company.currencyCode}
                </div>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
