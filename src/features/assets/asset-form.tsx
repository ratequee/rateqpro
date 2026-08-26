"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { saveAssetAction, saveCashAdvanceAction } from "./actions";

const CATEGORIES = ["VEHICLES", "EQUIPMENT", "FURNITURE", "DEVICES", "OTHER"] as const;

export function AssetFormDialog({
  currencyCode,
  asset,
}: {
  currencyCode: string;
  asset?: {
    id: string;
    name: string;
    category: (typeof CATEGORIES)[number];
    purchaseValue: string;
    purchaseDate: string;
    notes: string | null;
    status?: "ACTIVE" | "DISPOSED" | "UNDER_MAINTENANCE";
  };
}) {
  const t = useTranslations("assetsPage");
  const tCommon = useTranslations("common");
  return (
    <RecordFormDialog
      title={asset ? tCommon("edit") : t("add")}
      trigger={
        <Button size={asset ? "sm" : "default"} variant={asset ? "outline" : "default"}>
          {asset ? tCommon("edit") : t("add")}
        </Button>
      }
      action={saveAssetAction}
    >
      {asset ? <input type="hidden" name="id" value={asset.id} /> : null}
      <input type="hidden" name="status" value={asset?.status ?? "ACTIVE"} />
      <div className="space-y-1.5">
        <Label htmlFor="asset-name">{t("name")}</Label>
        <Input id="asset-name" name="name" required defaultValue={asset?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="asset-cat">{t("categoryLabel")}</Label>
        <NativeSelect id="asset-cat" name="category" defaultValue={asset?.category ?? "VEHICLES"}>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {t(`categories.${item}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <CurrencyInput
        id="asset-value"
        name="purchaseValue"
        label={t("value")}
        currencyCode={currencyCode}
        defaultValue={asset?.purchaseValue}
        required
      />
      <div className="space-y-1.5">
        <Label htmlFor="asset-date">{t("purchaseDate")}</Label>
        <Input id="asset-date" name="purchaseDate" type="date" defaultValue={asset?.purchaseDate} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="asset-notes">{t("notes")}</Label>
        <Textarea id="asset-notes" name="notes" defaultValue={asset?.notes ?? ""} />
      </div>
    </RecordFormDialog>
  );
}

export function CashAdvanceFormDialog({
  currencyCode,
  advance,
}: {
  currencyCode: string;
  advance?: {
    id: string;
    personName: string;
    amountIssued: string;
    issueDate: string;
    dueDate: string;
  };
}) {
  const t = useTranslations("assetsPage");
  const tCommon = useTranslations("common");
  return (
    <RecordFormDialog
      title={advance ? tCommon("edit") : t("addCustody")}
      trigger={
        <Button size={advance ? "sm" : "default"} variant={advance ? "outline" : "outline"}>
          {advance ? tCommon("edit") : t("addCustody")}
        </Button>
      }
      action={saveCashAdvanceAction}
    >
      {advance ? <input type="hidden" name="id" value={advance.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="ca-name">{t("employee")}</Label>
        <Input id="ca-name" name="personName" required defaultValue={advance?.personName} />
      </div>
      <CurrencyInput
        id="ca-amount"
        name="amountIssued"
        label={t("amount")}
        currencyCode={currencyCode}
        defaultValue={advance?.amountIssued}
        required
      />
      <div className="space-y-1.5">
        <Label htmlFor="ca-date">{t("date")}</Label>
        <Input id="ca-date" name="issueDate" type="date" required defaultValue={advance?.issueDate} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ca-due">{t("dueDate")}</Label>
        <Input id="ca-due" name="dueDate" type="date" defaultValue={advance?.dueDate} />
      </div>
    </RecordFormDialog>
  );
}
