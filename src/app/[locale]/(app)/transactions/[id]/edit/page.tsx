import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { toDateInputValue } from "@/lib/formatting/date";
import {
  getTransaction,
  listBankAccounts,
  listCompanyProjects,
} from "@/services/transactions";
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
  if (!transaction || transaction.status !== "POSTED") {
    notFound();
  }

  const t = await getTranslations("transactions");
  const [projects, accounts] = await Promise.all([
    listCompanyProjects(user.companyId),
    listBankAccounts(user.companyId),
  ]);

  return (
    <div>
      <PageHeader title={t("edit")} description={transaction.reference} />
      <TransactionForm
        mode="edit"
        currencyCode={user.currencyCode}
        projects={projects}
        accounts={accounts}
        transaction={{
          id: transaction.id,
          date: toDateInputValue(transaction.date),
          type: transaction.type,
          amount: transaction.amount.toFixed(2),
          description: transaction.description,
          category: transaction.category,
          projectId: transaction.projectId,
          notes: transaction.notes,
          bankAccountId: transaction.bankAccountId,
        }}
      />
    </div>
  );
}
