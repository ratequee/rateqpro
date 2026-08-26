import { Calculator } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { TaxCalculator } from "@/features/tax/tax-calculator";

export default async function TaxPage() {
  await requireUser();
  const t = await getTranslations("tax");
  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={Calculator} />
      <TaxCalculator />
    </div>
  );
}
