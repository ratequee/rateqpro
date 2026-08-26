import { BankReader } from "@/features/bank-reader/bank-reader";
import { requireUser } from "@/lib/auth/guards";
import { listBankAccounts } from "@/services/transactions";

export default async function BankReaderPage() {
  const user = await requireUser();
  const accounts = await listBankAccounts(user.companyId);
  return (
    <BankReader
      accounts={accounts.map((account) => ({ id: account.id, name: account.name }))}
      defaultAccountId={accounts.find((item) => item.isPrimary)?.id ?? accounts[0]?.id ?? ""}
    />
  );
}
