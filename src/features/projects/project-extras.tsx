"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { FileUploader } from "@/components/ui/file-uploader";
import { CurrencyInput } from "@/components/ui/currency-input";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { saveProjectDocumentAction, saveProjectPaymentAction } from "./extra-actions";

export function ProjectPaymentDialog({
  projectId,
  currencyCode,
}: {
  projectId: string;
  currencyCode: string;
}) {
  const t = useTranslations("projectsPage");
  return (
    <RecordFormDialog
      title={t("addPayment")}
      trigger={
        <Button size="sm" variant="outline">
          {t("addPayment")}
        </Button>
      }
      action={saveProjectPaymentAction}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <CurrencyInput id={`pay-${projectId}`} name="amount" label={t("paymentAmount")} currencyCode={currencyCode} required />
      <div className="space-y-1.5">
        <Label htmlFor={`due-${projectId}`}>{t("paymentDue")}</Label>
        <Input id={`due-${projectId}`} name="dueDate" type="date" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`pnotes-${projectId}`}>{t("notes")}</Label>
        <Textarea id={`pnotes-${projectId}`} name="notes" />
      </div>
    </RecordFormDialog>
  );
}

export function ProjectDocumentDialog({ projectId }: { projectId: string }) {
  const t = useTranslations("projectsPage");
  return (
    <RecordFormDialog
      title={t("addDocument")}
      trigger={
        <Button size="sm" variant="outline">
          {t("addDocument")}
        </Button>
      }
      action={saveProjectDocumentAction}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-1.5">
        <Label htmlFor={`pdname-${projectId}`}>{t("documentName")}</Label>
        <Input id={`pdname-${projectId}`} name="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`pdk-${projectId}`}>{t("documentKind")}</Label>
        <NativeSelect id={`pdk-${projectId}`} name="kind" defaultValue="NORMAL">
          <option value="NORMAL">{t("normalDoc")}</option>
          <option value="EXPIRING">{t("expiringDoc")}</option>
        </NativeSelect>
      </div>
      <FileUploader id={`pdfile-${projectId}`} name="attachment" label={t("file")} />
      <div className="space-y-1.5">
        <Label htmlFor={`pdn-${projectId}`}>{t("notes")}</Label>
        <Textarea id={`pdn-${projectId}`} name="notes" />
      </div>
    </RecordFormDialog>
  );
}
