import { getLocale, getTranslations } from "next-intl/server";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { AlertTriangle, Bell, CheckCheck, LayoutDashboard } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getDashboardWorkspace } from "@/lib/finance/workspace";
import { formatAmount } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { LOW_CASH_THRESHOLD } from "@/lib/finance/config";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { RunwayBanner } from "@/components/ui/runway-banner";
import { SectionCard } from "@/components/ui/section-card";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const data = await getDashboardWorkspace(user.companyId);
  const { snapshot } = data;
  const amount = (value: bigint) => formatAmount(value, locale);
  const runway =
    data.runwayMonths === null ? "—" : data.runwayMonths.toFixed(1);

  const today = format(new Date(), locale === "ar" ? "EEEE، d MMMM yyyy" : "EEEE, d MMMM yyyy", {
    locale: locale === "ar" ? ar : enUS,
  });

  const alerts: string[] = [];
  if (snapshot.alerts.lowCash) {
    alerts.push(
      t("lowCash", {
        threshold: formatAmount(LOW_CASH_THRESHOLD, locale),
      }),
    );
  }
  if (snapshot.alerts.overdueObligations > 0) {
    alerts.push(t("overdueObligations", { count: snapshot.alerts.overdueObligations }));
  }
  if (snapshot.alerts.upcomingObligations > 0) {
    alerts.push(t("upcomingObligations", { count: snapshot.alerts.upcomingObligations }));
  }

  const runwayMessage =
    data.runwayMonths === null
      ? t("runwayUnknown")
      : data.runwayMonths < 4
        ? t("runwayMessage", { months: runway })
        : t("runwayHealthy", { months: runway });

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        title={t("title")}
        icon={LayoutDashboard}
        meta={<span className="text-xs text-muted-foreground">{today}</span>}
      />

      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          href="/bank-accounts"
          accent="brand"
          label={t("totalLiquidity")}
          value={amount(snapshot.liquidAssets)}
          hint={user.currencyCode}
        />
        <KpiCard
          href="/approvals"
          accent="warning"
          label={t("awaitingApproval")}
          value={String(snapshot.alerts.overdueObligations)}
          hint={t("pendingExpenses")}
        />
        <KpiCard
          href="/projects"
          accent="success"
          label={t("activeProjects")}
          value={String(snapshot.projects.active)}
          hint={t("ofTotal", { total: snapshot.projects.total })}
        />
        <KpiCard
          href="/clients"
          accent="info"
          label={t("totalClients")}
          value={String(data.clientCount)}
          hint={t("activeClients")}
        />
      </section>

      <RunwayBanner
        href="/cash-flow"
        label={t("runway")}
        months={runway}
        unit={t("runwayUnit")}
        message={runwayMessage}
      />

      <section className="grid gap-3.5 lg:grid-cols-2">
        <SectionCard
          title={t("recentExpenses")}
          icon={CheckCheck}
          action={
            <Button variant="link" size="sm" className="h-auto p-0 text-[11.5px] text-primary" asChild>
              <Link href="/transactions">{t("viewAll")}</Link>
            </Button>
          }
        >
          {data.recentWithdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRecent")}</p>
          ) : (
            data.recentWithdrawals.map((row) => (
              <Link
                key={row.id}
                href={`/transactions/${row.id}`}
                className="flex items-center gap-2.5 border-b border-muted py-2.5 last:border-0"
              >
                <InitialsAvatar name={row.createdBy.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{row.description}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {row.createdBy.name}
                    {row.project ? ` · ${row.project.code}` : ""}
                    {" · "}
                    {formatDate(row.date, user.dateFormat, locale)}
                  </div>
                </div>
                <span className="text-[13px] font-bold">
                  {formatAmount(row.amount.toString(), locale)} {user.currencyCode}
                </span>
              </Link>
            ))
          )}
        </SectionCard>

        <SectionCard title={t("alerts")} icon={Bell}>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noAlerts")}</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert}
                className="flex items-center gap-2.5 border-b border-muted py-2.5 last:border-0"
              >
                <div className="flex size-[34px] items-center justify-center rounded-full bg-er-bg text-destructive">
                  <AlertTriangle className="size-4" />
                </div>
                <div className="text-[12.5px] font-semibold">{alert}</div>
              </div>
            ))
          )}
        </SectionCard>
      </section>
    </div>
  );
}
