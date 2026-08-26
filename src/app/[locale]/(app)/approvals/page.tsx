import { getLocale, getTranslations } from "next-intl/server";
import { CheckCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getDashboardWorkspace } from "@/lib/finance/workspace";
import { formatAmount } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusPill } from "@/components/ui/status-pill";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ApprovalsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("approvals");
  const data = await getDashboardWorkspace(user.companyId);
  const overdue = data.obligationRows.filter(
    (item) => item.nextDueDate < new Date(),
  );
  const total = overdue.reduce((sum, item) => sum + Number(item.amount.toString()), 0);

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={CheckCheck} />
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <KpiCard accent="warning" label={t("pendingExpenses")} value={String(overdue.length)} />
        <KpiCard accent="info" label={t("bankTransactions")} value="0" />
        <KpiCard accent="none" label={t("payroll")} value="0" />
        <KpiCard
          accent="brand"
          label={t("totalAmount")}
          value={formatAmount(total, locale)}
          hint={user.currencyCode}
        />
      </section>
      {overdue.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {overdue.map((item) => (
            <div
              key={item.id}
              className="rounded-[10px] border border-border border-s-4 border-s-warning bg-card px-[15px] py-3"
            >
              <div className="flex items-center gap-2.5">
                <InitialsAvatar name={item.name} tone="warning" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold">
                    {item.name}
                    <StatusPill>{t("overdue")}</StatusPill>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {t("due", { date: formatDate(item.nextDueDate, user.dateFormat, locale) })}
                  </div>
                </div>
                <div className="text-[15px] font-bold">
                  {formatAmount(item.amount.toString(), locale)} {user.currencyCode}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
