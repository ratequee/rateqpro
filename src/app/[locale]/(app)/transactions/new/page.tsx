import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { listBankAccounts, listCompanyProjects, getPrimaryBankAccount } from "@/services/transactions";
import { PageHeader } from "@/components/ui/page-header";
import { TransactionForm } from "@/features/transactions/transaction-form";

export default async function NewTransactionPage() {
  const user = await requirePermission("transactions", "create");
  const t = await getTranslations("transactions");
  const [projects, accounts, primary] = await Promise.all([
    listCompanyProjects(user.companyId),
    listBankAccounts(user.companyId),
    getPrimaryBankAccount(user.companyId),
  ]);

  return (
    <div>
      <PageHeader title={t("add")} description={t("formSubtitle")} />
      <TransactionForm
        mode="create"
        currencyCode={user.currencyCode}
        projects={projects}
        accounts={accounts.length ? accounts : primary ? [primary] : []}
      />
    </div>
  );
}
