import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDownLeft, ArrowUpRight, PieChart } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getReportsWorkspace } from "@/lib/finance/workspace";
import { formatAmount } from "@/lib/formatting/currency";
import { PageHeader } from "@/components/ui/page-header";
import { isTransactionCategory } from "@/lib/finance/categories";

export default async function ReportsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("reportsPage");
  const tCat = await getTranslations("transactions.categories");
  const { snapshot, expenseLines } = await getReportsWorkspace(user.companyId);
  const isLoss = snapshot.netProfit < 0n;

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={PieChart} />
      <div className="flex items-center justify-between rounded-[13px] bg-linear-to-br from-primary-deep to-primary px-5 py-4 text-white">
        <div>
          <div className="text-[11px] text-white/55">{t("period")}</div>
          <div className="text-base font-bold">{t("pnl")}</div>
          <div className="text-[11px] text-white/50">{user.companyName}</div>
        </div>
        <div className="text-end">
          <div className="text-[11px] text-white/55">{t("netProfit")}</div>
          <div className={`text-[26px] font-bold ${isLoss ? "text-red-300" : "text-gold-bright"}`}>
            {formatAmount(snapshot.netProfit, locale)} {user.currencyCode}
          </div>
          <div className="text-[10px] text-white/45">{isLoss ? t("loss") : t("profit")}</div>
        </div>
      </div>
      <div className="overflow-hidden rounded-[13px] border border-border bg-card">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted px-3.5 py-2.5 text-[12.5px] font-bold">
          <ArrowDownLeft className="size-4 text-success" />
          {t("revenue")}
        </div>
        <Line label={t("collectedRevenue")} value={formatAmount(snapshot.revenue, locale)} tone="ok" />
        <Line label={t("pendingRevenue")} value="—" muted />
      </div>
      <div className="overflow-hidden rounded-[13px] border border-border bg-card">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted px-3.5 py-2.5 text-[12.5px] font-bold">
          <ArrowUpRight className="size-4 text-destructive" />
          {t("expenses")}
        </div>
        {expenseLines.map((line) => (
          <Line
            key={line.category}
            label={isTransactionCategory(line.category) ? tCat(line.category) : line.category}
            value={formatAmount(line.amount, locale)}
            tone="er"
          />
        ))}
        <div className="flex justify-between bg-brand-soft px-3.5 py-2 text-[13px] font-bold text-primary-deep">
          <span>{t("totalExpenses")}</span>
          <span>
            {formatAmount(snapshot.expenses, locale)} {user.currencyCode}
          </span>
        </div>
      </div>
    </div>
  );
}

function Line({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: string;
  tone?: "ok" | "er";
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between border-b border-muted px-3.5 py-2 text-[13px] last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          muted
            ? "text-ink-light"
            : tone === "ok"
              ? "font-semibold text-success"
              : "text-destructive"
        }
      >
        {value}
      </span>
    </div>
  );
}
