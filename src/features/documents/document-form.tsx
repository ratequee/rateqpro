"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { saveDocumentAction } from "./actions";

const CATEGORIES = ["LICENSE", "CR", "ID", "CONTRACT", "INSURANCE", "OTHER"] as const;

export function DocumentFormDialog({
  document,
}: {
  document?: {
    id: string;
    name: string;
    category: string;
    expiryDate: string;
    notes: string | null;
  };
}) {
  const t = useTranslations("documentsPage");
  const tCommon = useTranslations("common");
  return (
    <RecordFormDialog
      title={document ? tCommon("edit") : t("add")}
      trigger={
        <Button size={document ? "sm" : "default"} variant={document ? "outline" : "default"}>
          {document ? tCommon("edit") : t("add")}
        </Button>
      }
      action={saveDocumentAction}
    >
      {document ? <input type="hidden" name="id" value={document.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="doc-name">{t("name")}</Label>
        <Input id="doc-name" name="name" required defaultValue={document?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="doc-cat">{t("category")}</Label>
        <NativeSelect id="doc-cat" name="category" defaultValue={document?.category ?? "OTHER"}>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {t(`categories.${item}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="doc-expiry">{t("expiryDate")}</Label>
        <Input id="doc-expiry" name="expiryDate" type="date" defaultValue={document?.expiryDate} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="doc-notes">{t("notes")}</Label>
        <Textarea id="doc-notes" name="notes" defaultValue={document?.notes ?? ""} />
      </div>
    </RecordFormDialog>
  );
}
