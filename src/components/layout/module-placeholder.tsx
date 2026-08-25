import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

type ModuleKey =
  | "transactions"
  | "projects"
  | "contracts"
  | "projectExpenses"
  | "operatingExpenses"
  | "cashAdvances"
  | "creditCards"
  | "employees"
  | "payroll"
  | "assets"
  | "cashFlow"
  | "obligations"
  | "reports"
  | "notifications"
  | "auditLog";

type EmptyKey = ModuleKey | "users" | "roles";

export async function ModulePlaceholder({
  moduleKey,
  emptyKey,
}: {
  moduleKey: ModuleKey;
  emptyKey: EmptyKey;
}) {
  const tModule = await getTranslations("module");
  const tEmpty = await getTranslations("empty");
  const tCommon = await getTranslations("common");

  return (
    <div>
      <PageHeader
        title={tModule(`${moduleKey}.title`)}
        description={tModule(`${moduleKey}.subtitle`)}
      />
      <EmptyState
        title={tEmpty(`${emptyKey}.title`)}
        description={`${tEmpty(`${emptyKey}.description`)} ${tCommon("comingInLaterMilestone")}`}
      />
    </div>
  );
}
