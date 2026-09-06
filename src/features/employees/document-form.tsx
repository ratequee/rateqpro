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
import { DeleteRecordButton } from "@/features/records/delete-button";
import { saveEmployeeDocumentAction, deleteEmployeeDocumentAction } from "./document-actions";
import { formatDate } from "@/lib/formatting/date";

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

export function EmployeeDocumentList({
  documents,
  dateFormat,
  locale,
}: {
  documents: Array<{
    id: string;
    name: string;
    kind: "NORMAL" | "EXPIRING";
    expiryDate: Date | string | null;
    files: Array<{ id: string; fileName: string }>;
  }>;
  dateFormat: string;
  locale: string;
}) {
  const t = useTranslations("employeeDocs");

  if (documents.length === 0) {
    return <p className="text-[11px] text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="space-y-1.5">
      {documents.map((doc) => {
        const expired =
          doc.expiryDate && new Date(doc.expiryDate).getTime() < Date.now();
        return (
          <div
            key={doc.id}
            className="rounded-lg border border-border bg-muted/50 px-2 py-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold">{doc.name}</div>
                <div className={expired ? "text-[10px] text-destructive" : "text-[10px] text-muted-foreground"}>
                  {doc.kind === "EXPIRING" ? t("expiring") : t("normal")}
                  {doc.expiryDate
                    ? ` · ${formatDate(doc.expiryDate, dateFormat, locale)}`
                    : ""}
                </div>
                {doc.files.length > 0 ? (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {doc.files.map((file) => (
                      <a
                        key={file.id}
                        href={`/api/attachments/${file.id}`}
                        className="truncate text-[11px] font-medium text-primary hover:underline"
                      >
                        {file.fileName}
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground">{t("noFile")}</div>
                )}
              </div>
              <DeleteRecordButton
                id={doc.id}
                action={deleteEmployeeDocumentAction}
                label={t("remove")}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
