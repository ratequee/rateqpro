import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { listBankAccounts, listCompanyProjects, getPrimaryBankAccount } from "@/services/transactions";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { TransactionForm } from "@/features/transactions/transaction-form";

export default async function NewTransactionPage() {
  const user = await requirePermission("transactions", "create");
  const t = await getTranslations("transactions");
  const [projects, accounts, primary, cards, advances] = await Promise.all([
    listCompanyProjects(user.companyId),
    listBankAccounts(user.companyId),
    getPrimaryBankAccount(user.companyId),
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
      <PageHeader title={t("add")} description={t("formSubtitle")} />
      <TransactionForm
        mode="create"
        currencyCode={user.currencyCode}
        projects={projects}
        accounts={accounts.length ? accounts : primary ? [primary] : []}
        cards={cards}
        advances={advances}
      />
    </div>
  );
}
