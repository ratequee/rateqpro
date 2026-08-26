import { BankReader } from "@/features/bank-reader/bank-reader";
import { requireUser } from "@/lib/auth/guards";

export default async function BankReaderPage() {
  await requireUser();
  return <BankReader />;
}
