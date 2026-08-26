import { getLocale, getTranslations } from "next-intl/server";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getClientsWorkspace, getDashboardWorkspace } from "@/lib/finance/workspace";
import { formatAmount, filsToNumber } from "@/lib/formatting/currency";
import { calculateRunwayMonths } from "@/lib/finance/calculations";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { RunwayBanner } from "@/components/ui/runway-banner";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

export default async function CashFlowPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("cashFlowPage");
  const [data, clients] = await Promise.all([
    getDashboardWorkspace(user.companyId),
    getClientsWorkspace(user.companyId),
  ]);
  const runway = calculateRunwayMonths(
    data.snapshot.bankBalance,
    data.snapshot.monthlyObligations,
  );
  const runwayLabel = runway === null ? "—" : runway.toFixed(1);
  const outstanding = clients.reduce((sum, item) => sum + item.outstanding, 0n);
  const monthly = filsToNumber(data.snapshot.monthlyObligations);
  let running = filsToNumber(data.snapshot.bankBalance);

  const months = [0, 1, 2].map((offset) => {
    const date = new Date();
    date.setMonth(date.getMonth() + offset);
    const net = -monthly;
    running += net;
    return {
      date,
      net,
      after: running,
      current: offset === 0,
    };
  });

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={TrendingUp} />
      <RunwayBanner
        label={t("runway")}
        months={runwayLabel}
        unit={t("title")}
        message={t("outstandingHint", { amount: formatAmount(outstanding, locale) })}
      />
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <KpiCard
          accent="brand"
          label={t("currentBalance")}
          value={formatAmount(data.snapshot.bankBalance, locale)}
          hint={user.currencyCode}
        />
        <KpiCard accent="success" label={t("expectedIncome")} value="0" valueClassName="text-muted-foreground" />
        <KpiCard
          accent="danger"
          label={t("monthlyObligations")}
          value={formatAmount(data.snapshot.monthlyObligations, locale)}
          hint={user.currencyCode}
          valueClassName="text-destructive"
        />
        <KpiCard
          accent="warning"
          label={t("overdueCollections")}
          value={formatAmount(outstanding, locale)}
          hint={user.currencyCode}
          valueClassName="text-warning"
        />
      </section>
      <div className="grid gap-2.5 md:grid-cols-3">
        {months.map((month) => (
          <div
            key={month.date.toISOString()}
            className={cn(
              "rounded-[10px] border bg-card p-3.5",
              month.current ? "border-primary border-[1.5px]" : "border-border",
            )}
          >
            <div className="mb-2.5 flex items-center justify-between text-[13px] font-bold">
              <span>
                {format(month.date, "MMMM yyyy", { locale: locale === "ar" ? ar : enUS })}
              </span>
              {month.current ? <StatusPill>{t("next")}</StatusPill> : null}
            </div>
            <Row label={t("expected")} value="0" className="text-success" />
            <Row
              label={t("monthlyObligations")}
              value={`−${formatAmount(data.snapshot.monthlyObligations, locale)}`}
              className="text-destructive"
            />
            <div className="mt-1.5 flex justify-between border-t border-muted pt-1.5 text-[13px] font-bold">
              <span>{t("net")}</span>
              <span className={month.net >= 0 ? "text-success" : "text-destructive"}>
                {formatAmount(month.net, locale)}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-ink-light">
              <span>{t("balanceAfter")}</span>
              <span className="font-bold text-success">
                {formatAmount(month.after, locale)} {user.currencyCode}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between py-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}
