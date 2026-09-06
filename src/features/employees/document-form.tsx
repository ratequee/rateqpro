"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/ui/file-uploader";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { saveEmployeeDocumentAction } from "./document-actions";

export function EmployeeDocumentDialog({ employeeId }: { employeeId: string }) {
  const t = useTranslations("employeeDocs");
  const tCommon = useTranslations("common");
  const [kind, setKind] = useState<"NORMAL" | "EXPIRING">("NORMAL");

  return (
    <RecordFormDialog
      title={t("add")}
      trigger={
        <Button size="sm" variant="outline">
          {t("add")}
        </Button>
      }
      action={saveEmployeeDocumentAction}
    >
      <input type="hidden" name="employeeId" value={employeeId} />
      <div className="space-y-1.5">
        <Label htmlFor="doc-kind">{t("kind")}</Label>
        <NativeSelect
          id="doc-kind"
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as "NORMAL" | "EXPIRING")}
        >
          <option value="NORMAL">{t("normal")}</option>
          <option value="EXPIRING">{t("expiring")}</option>
        </NativeSelect>
        <p className="text-[11px] text-muted-foreground">{t("kindHint")}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="doc-name">{t("name")}</Label>
        <Input id="doc-name" name="name" required placeholder="QID / CR / Contract" />
      </div>
      {kind === "EXPIRING" ? (
        <div className="space-y-1.5">
          <Label htmlFor="doc-expiry">{t("expiry")}</Label>
          <Input id="doc-expiry" name="expiryDate" type="date" required />
        </div>
      ) : (
        <input type="hidden" name="expiryDate" value="" />
      )}
      <FileUploader id={`emp-doc-${employeeId}`} name="attachment" label={tCommon("add")} />
      <div className="space-y-1.5">
        <Label htmlFor="doc-notes">{t("notes")}</Label>
        <Textarea id="doc-notes" name="notes" />
      </div>
    </RecordFormDialog>
  );
}
