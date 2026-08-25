import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/permissions/check";
import { getCompanyFinancialSnapshot } from "@/lib/finance/engine";
import { formatMoney } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { LOW_CASH_THRESHOLD } from "@/lib/finance/config";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const tTx = await getTranslations("transactions");
  const snapshot = await getCompanyFinancialSnapshot(user.companyId);
  const money = (value: bigint) =>
    formatMoney(value, user.currencyCode, locale);
  const canCreate = hasPermission(user.role, "transactions", "create");

  const alerts: string[] = [];
  if (snapshot.alerts.lowCash) {
    alerts.push(
      t("lowCash", {
        threshold: formatMoney(LOW_CASH_THRESHOLD, user.currencyCode, locale),
      }),
    );
  }
  if (snapshot.alerts.overdueObligations > 0) {
    alerts.push(t("overdueObligations", { count: snapshot.alerts.overdueObligations }));
  }
  if (snapshot.alerts.upcomingObligations > 0) {
    alerts.push(t("upcomingObligations", { count: snapshot.alerts.upcomingObligations }));
  }

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/transactions/new">{tTx("add")}</Link>
            </Button>
          ) : null
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("bankBalance")} value={money(snapshot.bankBalance)} />
        <StatCard label={t("totalRevenue")} value={money(snapshot.revenue)} />
        <StatCard label={t("totalExpenses")} value={money(snapshot.expenses)} />
        <StatCard label={t("netProfit")} value={money(snapshot.netProfit)} />
        <StatCard label={t("expectedProfit")} value={money(snapshot.expectedProfit)} />
        <StatCard
          label={t("monthlyObligations")}
          value={money(snapshot.monthlyObligations)}
        />
        <StatCard label={t("cashPosition")} value={money(snapshot.cashPosition)} />
        <StatCard label={t("forecast")} value={money(snapshot.forecast)} />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
            {t("projects")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label={t("totalProjects")}
              value={String(snapshot.projects.total)}
              className="shadow-none"
            />
            <StatCard
              label={t("activeProjects")}
              value={String(snapshot.projects.active)}
              className="shadow-none"
            />
            <StatCard
              label={t("completedProjects")}
              value={String(snapshot.projects.completed)}
              className="shadow-none"
            />
            <StatCard
              label={t("totalContracts")}
              value={String(snapshot.projects.contracts)}
              className="shadow-none"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
            {t("cashFlow")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label={t("currentCash")}
              value={money(snapshot.cashPosition)}
              className="shadow-none"
            />
            <StatCard
              label={t("expectedIncome")}
              value={money(snapshot.expectedIncome)}
              className="shadow-none"
            />
            <StatCard
              label={t("expectedExpenses")}
              value={money(snapshot.expectedExpenses)}
              className="shadow-none"
            />
            <StatCard
              label={t("forecast")}
              value={money(snapshot.forecast)}
              className="shadow-none"
            />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("recent")}</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/transactions">{t("viewTransactions")}</Link>
          </Button>
        </div>
        {snapshot.recent.length === 0 ? (
          <EmptyState title={t("emptyHint")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
            <table className="min-w-full text-start text-sm">
              <tbody>
                {snapshot.recent.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/transactions/${row.id}`} className="hover:underline">
                        {row.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(row.date, user.dateFormat, locale)}
                    </td>
                    <td className="px-4 py-3">{row.description}</td>
                    <td className="px-4 py-3">
                      {row.type === "DEPOSIT" ? tTx("deposit") : tTx("withdrawal")}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatMoney(row.amount.toString(), user.currencyCode, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          {t("alerts")}
        </h2>
        {alerts.length === 0 ? (
          <EmptyState title={t("noAlerts")} />
        ) : (
          <ul className="space-y-2 rounded-xl border border-border bg-card p-5 shadow-card">
            {alerts.map((alert) => (
              <li key={alert} className="text-sm">
                {alert}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
