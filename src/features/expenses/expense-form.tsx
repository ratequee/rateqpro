"use client";

import { useState } from "react";
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
import {
  OPERATING_WITHDRAWAL_CATEGORIES,
  PROJECT_WITHDRAWAL_CATEGORIES,
} from "@/lib/finance/categories";

export function ExpenseFormDialog({
  kind: initialKind,
  allowKindSwitch = false,
  canOperating = true,
  canProject = true,
  currencyCode,
  projects,
  accounts = [],
  cards = [],
  advances = [],
  expense,
}: {
  kind: "PROJECT" | "OPERATING";
  allowKindSwitch?: boolean;
  canOperating?: boolean;
  canProject?: boolean;
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
  const [kind, setKind] = useState<"PROJECT" | "OPERATING">(initialKind);
  const categories = kind === "PROJECT" ? PROJECT_WITHDRAWAL_CATEGORIES : OPERATING_WITHDRAWAL_CATEGORIES;

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
      {allowKindSwitch && !expense ? (
        <div className="space-y-1.5">
          <Label htmlFor="exp-kind">{t("kind")}</Label>
          <NativeSelect
            id="exp-kind"
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as "PROJECT" | "OPERATING")}
          >
            {canOperating ? <option value="OPERATING">{t("operating")}</option> : null}
            {canProject ? <option value="PROJECT">{t("projectKind")}</option> : null}
          </NativeSelect>
        </div>
      ) : (
        <input type="hidden" name="kind" value={kind} />
      )}
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
      ) : (
        <input type="hidden" name="projectId" value="" />
      )}
      <div className="space-y-1.5">
        <Label htmlFor="exp-desc">{t("description")}</Label>
        <Textarea id="exp-desc" name="description" required rows={3} defaultValue={expense?.description} />
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
        <NativeSelect
            id="exp-cat"
            key={`${kind}-${expense?.id ?? "new"}`}
            name="category"
            defaultValue={
              categories.includes(expense?.category as (typeof categories)[number])
                ? expense?.category
                : categories[0]
            }
          >
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
