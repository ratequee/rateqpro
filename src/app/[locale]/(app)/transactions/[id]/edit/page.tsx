import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { toDateInputValue } from "@/lib/formatting/date";
import {
  getTransaction,
  listBankAccounts,
  listCompanyProjects,
} from "@/services/transactions";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { TransactionForm } from "@/features/transactions/transaction-form";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("transactions", "edit");
  const { id } = await params;
  const transaction = await getTransaction(user.companyId, id);
  if (!transaction || (transaction.status !== "POSTED" && transaction.status !== "PENDING")) {
    notFound();
  }

  const t = await getTranslations("transactions");
  const [projects, accounts, cards, advances] = await Promise.all([
    listCompanyProjects(user.companyId),
    listBankAccounts(user.companyId),
    prisma.creditCard.findMany({
      where: { ...companyScope(user.companyId), isActive: true },
      select: { id: true, name: true, last4: true },
    }),
    prisma.cashAdvance.findMany({
      where: { ...companyScope(user.companyId), status: { in: ["OPEN", "PARTIALLY_SETTLED"] } },
      select: { id: true, personName: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title={t("edit")} description={transaction.reference} />
      <TransactionForm
        mode="edit"
        currencyCode={user.currencyCode}
        projects={projects}
        accounts={accounts}
        cards={cards}
        advances={advances}
        transaction={{
          id: transaction.id,
          date: toDateInputValue(transaction.date),
          type: transaction.type,
          amount: transaction.amount.toFixed(2),
          description: transaction.description,
          category: transaction.category,
          projectId: transaction.projectId,
          notes: transaction.notes,
          bankAccountId: transaction.bankAccountId ?? "",
          paymentSource: transaction.paymentSource,
          expenseKind: transaction.expenseKind,
          creditCardId: transaction.creditCardId,
          cashAdvanceId: transaction.cashAdvanceId,
        }}
      />
    </div>
  );
}
