"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { saveClientAction } from "./actions";

export function ClientFormDialog({
  client,
}: {
  client?: { id: string; name: string; email: string | null; phone: string | null; notes?: string | null };
}) {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");
  return (
    <RecordFormDialog
      title={client ? tCommon("edit") : t("add")}
      trigger={
        <Button size={client ? "sm" : "default"} variant={client ? "outline" : "default"}>
          {client ? tCommon("edit") : t("add")}
        </Button>
      }
      action={saveClientAction}
    >
      {client ? <input type="hidden" name="id" value={client.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="client-name">{t("name")}</Label>
        <Input id="client-name" name="name" required defaultValue={client?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-phone">{t("phone")}</Label>
        <Input id="client-phone" name="phone" defaultValue={client?.phone ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-email">{t("email")}</Label>
        <Input id="client-email" name="email" type="email" defaultValue={client?.email ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-notes">{t("notes")}</Label>
        <Textarea id="client-notes" name="notes" defaultValue={client?.notes ?? ""} />
      </div>
    </RecordFormDialog>
  );
}
