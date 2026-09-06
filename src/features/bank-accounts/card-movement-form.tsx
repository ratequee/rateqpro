"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { saveCardMovementAction } from "./actions";
import { todayInputValue } from "@/lib/formatting/date";
import { PaymentSourceFields } from "@/features/payments/source-fields";

export function CardMovementDialog({
  cardId,
  kind,
  currencyCode,
  accounts = [],
}: {
  cardId: string;
  kind: "TOPUP" | "CHARGE";
  currencyCode: string;
  accounts?: Array<{ id: string; name: string; isPrimary?: boolean }>;
}) {
  const t = useTranslations("bank");
  return (
    <RecordFormDialog
      title={kind === "TOPUP" ? t("addMoney") : t("chargeCard")}
      trigger={
        <Button size="sm" variant={kind === "TOPUP" ? "secondary" : "outline"}>
          {kind === "TOPUP" ? t("addMoney") : t("chargeCard")}
        </Button>
      }
      action={saveCardMovementAction}
    >
      <input type="hidden" name="creditCardId" value={cardId} />
      <input type="hidden" name="kind" value={kind} />
      <CurrencyInput
        id={`${cardId}-${kind}-amount`}
        name="amount"
        label={t("amount")}
        currencyCode={currencyCode}
        required
      />
      <div className="space-y-1.5">
        <Label htmlFor={`${cardId}-${kind}-desc`}>{t("description")}</Label>
        <Input
          id={`${cardId}-${kind}-desc`}
          name="description"
          required
          defaultValue={kind === "TOPUP" ? t("cardTopup") : t("cardCharge")}
        />
      </div>
      {kind === "TOPUP" ? (
        <PaymentSourceFields
          name="fundFrom"
          accounts={accounts}
          cards={[]}
          advances={[]}
          allowEmpty
          emptyLabel={t("cardOnlyFund")}
        />
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor={`${cardId}-${kind}-date`}>{t("date")}</Label>
        <Input
          id={`${cardId}-${kind}-date`}
          name="date"
          type="date"
          required
          defaultValue={todayInputValue()}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${cardId}-${kind}-notes`}>{t("notes")}</Label>
        <Textarea id={`${cardId}-${kind}-notes`} name="notes" />
      </div>
    </RecordFormDialog>
  );
}
