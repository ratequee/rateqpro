import { getLocale, getTranslations } from "next-intl/server";
import { Receipt } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { formatAmount } from "@/lib/formatting/currency";
import { formatDate, toDateInputValue } from "@/lib/formatting/date";
import { serializeMoney } from "@/features/records/helpers";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { HorizontalScroll } from "@/components/ui/horizontal-scroll";
import { ExpenseFormDialog } from "@/features/expenses/expense-form";
import { DeleteRecordButton } from "@/features/records/delete-button";
import { deleteExpenseAction } from "@/features/expenses/actions";
import { isTransactionCategory } from "@/lib/finance/categories";
import { encodePaymentSource } from "@/lib/finance/payment-source";

export default async function ProjectExpensesPage() {
  const user = await requirePermission("expenses", "view");
  const locale = await getLocale();
  const t = await getTranslations("expensesPage");
  const tCat = await getTranslations("transactions.categories");
  const [rows, projects, accounts, cards, advances] = await Promise.all([
    prisma.expense.findMany({
      where: { ...companyScope(user.companyId), kind: "PROJECT" },
      orderBy: { date: "desc" },
      include: { project: { select: { code: true, name: true } } },
    }),
    prisma.project.findMany({
      where: companyScope(user.companyId),
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.bankAccount.findMany({
      where: { ...companyScope(user.companyId), isActive: true },
      select: { id: true, name: true, isPrimary: true },
    }),
    prisma.creditCard.findMany({
      where: { ...companyScope(user.companyId), isActive: true },
      select: { id: true, name: true, last4: true },
    }),
    prisma.cashAdvance.findMany({
      where: { ...companyScope(user.companyId), status: { in: ["OPEN", "PARTIALLY_SETTLED"] } },
      select: { id: true, personName: true },
    }),
  ]);
  const total = rows.reduce((sum, row) => sum + Number(row.amount.toString()), 0);

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        title={t("projectTitle")}
        icon={Receipt}
        actions={
          <ExpenseFormDialog
            kind="PROJECT"
            currencyCode={user.currencyCode}
            projects={projects}
            accounts={accounts}
            cards={cards}
            advances={advances}
          />
        }
      />
      {rows.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <HorizontalScroll className="rounded-[13px] border border-border bg-card" minWidth="900px">
          <div className="grid grid-cols-[1fr_140px_120px_120px_110px_minmax(140px,auto)] bg-muted px-3.5 py-2.5 text-[11px] font-semibold text-muted-foreground">
            <span>{t("description")}</span>
            <span>{t("project")}</span>
            <span>{t("category")}</span>
            <span>{t("amount")}</span>
            <span>{t("date")}</span>
            <span />
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_140px_120px_120px_110px_minmax(140px,auto)] items-center border-t border-muted px-3.5 py-2.5 text-[12.5px]"
            >
              <span className="font-semibold">{row.description}</span>
              <span className="text-muted-foreground">{row.project?.code ?? "—"}</span>
              <span className="text-muted-foreground">
                {isTransactionCategory(row.category) ? tCat(row.category) : row.category}
              </span>
              <span className="font-bold text-primary">
                {formatAmount(row.amount.toString(), locale)} {user.currencyCode}
              </span>
              <span>{formatDate(row.date, user.dateFormat, locale)}</span>
              <div className="flex gap-1">
                <ExpenseFormDialog
                  kind="PROJECT"
                  currencyCode={user.currencyCode}
                  projects={projects}
                  accounts={accounts}
                  cards={cards}
                  advances={advances}
                  expense={{
                    id: row.id,
                    description: row.description,
                    amount: serializeMoney(row.amount),
                    category: row.category,
                    date: toDateInputValue(row.date),
                    projectId: row.projectId,
                    notes: row.notes,
                    paymentSource: encodePaymentSource(
                      row.paymentSource,
                      row.creditCardId ?? row.cashAdvanceId ?? row.bankAccountId,
                    ),
                  }}
                />
                <DeleteRecordButton
                  id={row.id}
                  action={deleteExpenseAction}
                  fields={{ kind: "PROJECT" }}
                />
              </div>
            </div>
          ))}
          <div className="flex justify-between border-t border-border bg-muted px-3.5 py-2.5 text-sm font-bold">
            <span>{t("total")}</span>
            <span>
              {formatAmount(total, locale)} {user.currencyCode}
            </span>
          </div>
        </HorizontalScroll>
      )}
    </div>
  );
}
