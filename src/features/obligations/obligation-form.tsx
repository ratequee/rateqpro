"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { pauseObligationAction, payObligationAction, saveObligationAction } from "./actions";

const CATEGORIES = ["SALARIES", "RENT", "HOUSING", "VEHICLES", "SUBSCRIPTIONS", "OTHER"] as const;
const FREQUENCIES = ["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"] as const;

export function ObligationFormDialog({
  currencyCode,
  obligation,
}: {
  currencyCode: string;
  obligation?: {
    id: string;
    name: string;
    category: (typeof CATEGORIES)[number];
    amount: string;
    frequency: (typeof FREQUENCIES)[number];
    dueDate: string;
    notes: string | null;
  };
}) {
  const t = useTranslations("obligationsPage");
  const tCommon = useTranslations("common");
  return (
    <RecordFormDialog
      title={obligation ? tCommon("edit") : t("add")}
      trigger={
        <Button size={obligation ? "sm" : "default"} variant={obligation ? "outline" : "default"}>
          {obligation ? tCommon("edit") : t("add")}
        </Button>
      }
      action={saveObligationAction}
    >
      {obligation ? <input type="hidden" name="id" value={obligation.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="ob-name">{t("name")}</Label>
        <Input id="ob-name" name="name" required defaultValue={obligation?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ob-category">{t("category")}</Label>
        <NativeSelect id="ob-category" name="category" defaultValue={obligation?.category ?? "OTHER"}>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {t(`categories.${item}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <CurrencyInput
        id="ob-amount"
        name="amount"
        label={t("amount")}
        currencyCode={currencyCode}
        defaultValue={obligation?.amount}
        required
      />
      <div className="space-y-1.5">
        <Label htmlFor="ob-freq">{t("frequency")}</Label>
        <NativeSelect id="ob-freq" name="frequency" defaultValue={obligation?.frequency ?? "MONTHLY"}>
          {FREQUENCIES.map((item) => (
            <option key={item} value={item}>
              {t(`frequencies.${item}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ob-due">{t("dueDate")}</Label>
        <Input id="ob-due" name="dueDate" type="date" required defaultValue={obligation?.dueDate} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ob-notes">{t("notes")}</Label>
        <Textarea id="ob-notes" name="notes" defaultValue={obligation?.notes ?? ""} />
      </div>
    </RecordFormDialog>
  );
}

export function PayObligationButton({ id }: { id: string }) {
  const t = useTranslations("approvals");
  return (
    <form action={payObligationAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="success">
        {t("pay")}
      </Button>
    </form>
  );
}

export function PauseObligationButton({ id }: { id: string }) {
  const t = useTranslations("approvals");
  return (
    <form action={pauseObligationAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="outline">
        {t("pause")}
      </Button>
    </form>
  );
}
