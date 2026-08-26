"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { saveProjectAction } from "./actions";

const STATUSES = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

export function ProjectFormDialog({
  currencyCode,
  clients,
  project,
}: {
  currencyCode: string;
  clients: Array<{ id: string; name: string }>;
  project?: {
    id: string;
    name: string;
    code: string;
    clientId: string | null;
    contractValue: string;
    status: (typeof STATUSES)[number];
    notes: string | null;
  };
}) {
  const t = useTranslations("projectsPage");
  const tCommon = useTranslations("common");
  return (
    <RecordFormDialog
      title={project ? tCommon("edit") : t("add")}
      trigger={
        <Button size={project ? "sm" : "default"} variant={project ? "outline" : "default"}>
          {project ? tCommon("edit") : t("add")}
        </Button>
      }
      action={saveProjectAction}
    >
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="project-name">{t("name")}</Label>
        <Input id="project-name" name="name" required defaultValue={project?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="project-code">{t("code")}</Label>
        <Input id="project-code" name="code" defaultValue={project?.code} placeholder="PRJ-0001" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="project-client">{t("client")}</Label>
        <NativeSelect id="project-client" name="clientId" defaultValue={project?.clientId ?? ""}>
          <option value="">{t("noClient")}</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <CurrencyInput
        id="project-value"
        name="contractValue"
        label={t("contract")}
        currencyCode={currencyCode}
        defaultValue={project?.contractValue ?? "0"}
        required
      />
      <div className="space-y-1.5">
        <Label htmlFor="project-status">{t("status")}</Label>
        <NativeSelect id="project-status" name="status" defaultValue={project?.status ?? "ACTIVE"}>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`statuses.${status}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="project-start">{t("startDate")}</Label>
          <Input id="project-start" name="startDate" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-end">{t("endDate")}</Label>
          <Input id="project-end" name="endDate" type="date" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="project-notes">{t("notes")}</Label>
        <Textarea id="project-notes" name="notes" defaultValue={project?.notes ?? ""} />
      </div>
    </RecordFormDialog>
  );
}
