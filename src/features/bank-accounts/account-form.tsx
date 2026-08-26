"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { saveBankAccountAction, saveCreditCardAction } from "./actions";

export function BankAccountFormDialog({
  account,
}: {
  account?: {
    id: string;
    name: string;
    bankName: string | null;
    accountNo: string | null;
    isPrimary: boolean;
  };
}) {
  const t = useTranslations("bank");
  const tCommon = useTranslations("common");
  return (
    <RecordFormDialog
      title={account ? tCommon("edit") : t("addAccount")}
      trigger={
        <Button size={account ? "sm" : "default"} variant={account ? "secondary" : "default"}>
          {account ? tCommon("edit") : t("addAccount")}
        </Button>
      }
      action={saveBankAccountAction}
    >
      {account ? <input type="hidden" name="id" value={account.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="account-name">{t("accountName")}</Label>
        <Input id="account-name" name="name" required defaultValue={account?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="account-bank">{t("bankName")}</Label>
        <Input id="account-bank" name="bankName" defaultValue={account?.bankName ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="account-no">{t("accountNo")}</Label>
        <Input id="account-no" name="accountNo" defaultValue={account?.accountNo ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPrimary" className="size-4" defaultChecked={account?.isPrimary} />
        {t("setPrimary")}
      </label>
    </RecordFormDialog>
  );
}

export function CreditCardFormDialog({
  card,
}: {
  card?: { id: string; name: string; last4: string | null };
}) {
  const t = useTranslations("bank");
  const tCommon = useTranslations("common");
  return (
    <RecordFormDialog
      title={card ? tCommon("edit") : t("addCard")}
      trigger={
        <Button size={card ? "sm" : "default"} variant={card ? "secondary" : "outline"}>
          {card ? tCommon("edit") : t("addCard")}
        </Button>
      }
      action={saveCreditCardAction}
    >
      {card ? <input type="hidden" name="id" value={card.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="card-name">{t("cardName")}</Label>
        <Input id="card-name" name="name" required defaultValue={card?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="card-last4">{t("last4")}</Label>
        <Input id="card-last4" name="last4" maxLength={4} defaultValue={card?.last4 ?? ""} />
      </div>
    </RecordFormDialog>
  );
}
