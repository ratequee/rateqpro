import { getLocale, getTranslations } from "next-intl/server";
import { CheckCheck } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { formatAmount } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ApprovalButtons } from "@/features/approvals/approval-buttons";
import {
  approveBankTransactionAction,
  approveCardTransactionAction,
  approveExpenseAction,
  approvePayrollAction,
  rejectBankTransactionAction,
  rejectCardTransactionAction,
  rejectExpenseAction,
  rejectPayrollAction,
} from "@/features/approvals/actions";

export default async function ApprovalsPage() {
  const user = await requirePermission("approvals", "view");
  const locale = await getLocale();
  const t = await getTranslations("approvals");
  const scope = { ...companyScope(user.companyId), status: "PENDING" as const };
  const [transactions, cards, expenses, payrolls] = await Promise.all([
    prisma.bankTransaction.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.creditCardTransaction.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { creditCard: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.payroll.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { employee: { select: { name: true } } },
    }),
  ]);

  const total =
    transactions.reduce((sum, row) => sum + Number(row.amount.toString()), 0) +
    cards.reduce((sum, row) => sum + Number(row.amount.toString()), 0) +
    expenses.reduce((sum, row) => sum + Number(row.amount.toString()), 0) +
    payrolls.reduce((sum, row) => sum + Number(row.salary.toString()), 0);

  const empty =
    transactions.length + cards.length + expenses.length + payrolls.length === 0;

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={CheckCheck} />
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <KpiCard accent="warning" label={t("pendingExpenses")} value={String(expenses.length)} />
        <KpiCard accent="info" label={t("bankTransactions")} value={String(transactions.length + cards.length)} />
        <KpiCard accent="none" label={t("payroll")} value={String(payrolls.length)} />
        <KpiCard
          accent="brand"
          label={t("totalAmount")}
          value={formatAmount(total, locale)}
          hint={user.currencyCode}
        />
      </section>
      {empty ? (
        <EmptyState title={t("empty")} />
      ) : (
        <>
          {transactions.length > 0 ? (
            <SectionCard title={t("bankTransactions")}>
              {transactions.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 border-b border-muted py-2.5 last:border-0">
                  <div>
                    <div className="text-[13px] font-bold">{item.description}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatDate(item.date, user.dateFormat, locale)} · {item.paymentSource}
                    </div>
                  </div>
                  <div className="text-sm font-bold">
                    {formatAmount(item.amount.toString(), locale)} {user.currencyCode}
                  </div>
                  {user.role === "SUPER_ADMIN" ? (
                    <ApprovalButtons
                      id={item.id}
                      approve={approveBankTransactionAction}
                      reject={rejectBankTransactionAction}
                    />
                  ) : null}
                </div>
              ))}
            </SectionCard>
          ) : null}
          {cards.length > 0 ? (
            <SectionCard title={t("cards")}>
              {cards.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 border-b border-muted py-2.5 last:border-0">
                  <div>
                    <div className="text-[13px] font-bold">{item.description}</div>
                    <div className="text-[11px] text-muted-foreground">{item.creditCard.name}</div>
                  </div>
                  <div className="text-sm font-bold">
                    {formatAmount(item.amount.toString(), locale)} {user.currencyCode}
                  </div>
                  {user.role === "SUPER_ADMIN" ? (
                    <ApprovalButtons
                      id={item.id}
                      approve={approveCardTransactionAction}
                      reject={rejectCardTransactionAction}
                    />
                  ) : null}
                </div>
              ))}
            </SectionCard>
          ) : null}
          {expenses.length > 0 ? (
            <SectionCard title={t("pendingExpenses")}>
              {expenses.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 border-b border-muted py-2.5 last:border-0">
                  <div>
                    <div className="text-[13px] font-bold">{item.description}</div>
                    <div className="text-[11px] text-muted-foreground">{item.kind}</div>
                  </div>
                  <div className="text-sm font-bold">
                    {formatAmount(item.amount.toString(), locale)} {user.currencyCode}
                  </div>
                  {user.role === "SUPER_ADMIN" ? (
                    <ApprovalButtons
                      id={item.id}
                      approve={approveExpenseAction}
                      reject={rejectExpenseAction}
                    />
                  ) : null}
                </div>
              ))}
            </SectionCard>
          ) : null}
          {payrolls.length > 0 ? (
            <SectionCard title={t("payroll")}>
              {payrolls.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 border-b border-muted py-2.5 last:border-0">
                  <div className="text-[13px] font-bold">{item.employee.name}</div>
                  <div className="text-sm font-bold">
                    {formatAmount(item.salary.toString(), locale)} {user.currencyCode}
                  </div>
                  {user.role === "SUPER_ADMIN" ? (
                    <ApprovalButtons
                      id={item.id}
                      approve={approvePayrollAction}
                      reject={rejectPayrollAction}
                    />
                  ) : null}
                </div>
              ))}
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  );
}
