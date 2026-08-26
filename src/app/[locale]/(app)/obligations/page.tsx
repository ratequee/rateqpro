import { getLocale, getTranslations } from "next-intl/server";
import { ListChecks } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getDashboardWorkspace } from "@/lib/finance/workspace";
import { formatAmount, toFils } from "@/lib/formatting/currency";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import type { ObligationCategory } from "@prisma/client";

const barColors: Record<ObligationCategory, string> = {
  SALARIES: "bg-primary",
  RENT: "bg-info",
  HOUSING: "bg-warning",
  VEHICLES: "bg-warning",
  SUBSCRIPTIONS: "bg-success",
  OTHER: "bg-primary",
};

export default async function ObligationsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("obligationsPage");
  const data = await getDashboardWorkspace(user.companyId);
  const rows = data.obligationRows;
  const total = data.snapshot.monthlyObligations;
  const salaries = rows
    .filter((item) => item.category === "SALARIES")
    .reduce((sum, item) => sum + toFils(item.amount.toString()), 0n);
  const rent = rows
    .filter((item) => item.category === "RENT" || item.category === "HOUSING")
    .reduce((sum, item) => sum + toFils(item.amount.toString()), 0n);
  const other = total - salaries - rent;
  const max = rows.reduce((n, item) => Math.max(n, Number(item.amount.toString())), 1);

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={ListChecks} />
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <KpiCard
          accent="danger"
          label={t("total")}
          value={formatAmount(total, locale)}
          hint={t("perMonth")}
          valueClassName="text-destructive"
        />
        <KpiCard accent="brand" label={t("salaries")} value={formatAmount(salaries, locale)} hint={user.currencyCode} />
        <KpiCard accent="warning" label={t("rent")} value={formatAmount(rent, locale)} hint={user.currencyCode} />
        <KpiCard accent="none" label={t("other")} value={formatAmount(other, locale)} hint={user.currencyCode} />
      </section>
      {rows.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <SectionCard title={t("breakdown")} icon={ListChecks}>
          {rows.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 border-b border-muted py-2.5 last:border-0"
            >
              <span className="min-w-[165px] text-[12.5px]">{item.name}</span>
              <div className="h-[7px] flex-1 overflow-hidden rounded bg-muted">
                <div
                  className={`h-full rounded ${barColors[item.category]}`}
                  style={{ width: `${(Number(item.amount.toString()) / max) * 100}%` }}
                />
              </div>
              <span className="min-w-[95px] text-end text-[13px] font-bold text-primary">
                {formatAmount(item.amount.toString(), locale)} {user.currencyCode}
              </span>
              <StatusPill>
                {item.nextDueDate < new Date() ? t("pending") : t("pending")}
              </StatusPill>
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );
}
