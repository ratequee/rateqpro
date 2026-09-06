"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { saveExpenseAction } from "./actions";
import { PaymentSourceFields } from "@/features/payments/source-fields";

const PROJECT_CATEGORIES = [
  "materials",
  "subcontractors",
  "labor",
  "equipment",
  "transportation",
  "other",
] as const;
const OPERATING_CATEGORIES = [
  "rent",
  "salaries",
  "vehicles",
  "electricity",
  "internet",
  "marketing",
  "other",
] as const;

export function ExpenseFormDialog({
  kind,
  currencyCode,
  projects,
  accounts = [],
  cards = [],
  advances = [],
  expense,
}: {
  kind: "PROJECT" | "OPERATING";
  currencyCode: string;
  projects?: Array<{ id: string; code: string; name: string }>;
  accounts?: Array<{ id: string; name: string; isPrimary?: boolean }>;
  cards?: Array<{ id: string; name: string; last4?: string | null }>;
  advances?: Array<{ id: string; personName: string }>;
  expense?: {
    id: string;
    description: string;
    amount: string;
    category: string;
    date: string;
    projectId: string | null;
    notes: string | null;
    paymentSource?: string;
  };
}) {
  const t = useTranslations("expensesPage");
  const tCat = useTranslations("transactions.categories");
  const tCommon = useTranslations("common");
  const categories = kind === "PROJECT" ? PROJECT_CATEGORIES : OPERATING_CATEGORIES;

  return (
    <RecordFormDialog
      title={expense ? tCommon("edit") : t("add")}
      trigger={
        <Button size={expense ? "sm" : "default"} variant={expense ? "outline" : "default"}>
          {expense ? tCommon("edit") : t("add")}
        </Button>
      }
      action={saveExpenseAction}
    >
      {expense ? <input type="hidden" name="id" value={expense.id} /> : null}
      <input type="hidden" name="kind" value={kind} />
      {kind === "PROJECT" ? (
        <div className="space-y-1.5">
          <Label htmlFor="exp-project">{t("project")}</Label>
          <NativeSelect id="exp-project" name="projectId" required defaultValue={expense?.projectId ?? ""}>
            <option value="">{t("selectProject")}</option>
            {(projects ?? []).map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} — {project.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="exp-desc">{t("description")}</Label>
        <Input id="exp-desc" name="description" required defaultValue={expense?.description} />
      </div>
      <CurrencyInput
        id="exp-amount"
        name="amount"
        label={t("amount")}
        currencyCode={currencyCode}
        defaultValue={expense?.amount}
        required
      />
      <div className="space-y-1.5">
        <Label htmlFor="exp-cat">{t("category")}</Label>
        <NativeSelect id="exp-cat" name="category" defaultValue={expense?.category ?? categories[0]}>
          {categories.map((item) => (
            <option key={item} value={item}>
              {tCat(item)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <PaymentSourceFields
        accounts={accounts}
        cards={cards}
        advances={advances}
        defaultValue={expense?.paymentSource}
      />
      <div className="space-y-1.5">
        <Label htmlFor="exp-date">{t("date")}</Label>
        <Input id="exp-date" name="date" type="date" required defaultValue={expense?.date} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="exp-notes">{t("notes")}</Label>
        <Textarea id="exp-notes" name="notes" defaultValue={expense?.notes ?? ""} />
      </div>
    </RecordFormDialog>
  );
}
