"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { saveEmployeeAction } from "./actions";

export function EmployeeFormDialog({
  currencyCode,
  employee,
  needsApproval = false,
}: {
  currencyCode: string;
  needsApproval?: boolean;
  employee?: {
    id: string;
    name: string;
    position: string | null;
    phone: string | null;
    email: string | null;
    salary: string;
    status: "ACTIVE" | "INACTIVE";
    notes: string | null;
    joiningDate?: string;
  };
}) {
  const t = useTranslations("employeesPage");
  const tCommon = useTranslations("common");
  return (
    <RecordFormDialog
      title={employee ? tCommon("edit") : t("add")}
      trigger={
        <Button size={employee ? "sm" : "default"} variant={employee ? "outline" : "default"}>
          {employee ? tCommon("edit") : t("add")}
        </Button>
      }
      action={saveEmployeeAction}
    >
      {employee ? <input type="hidden" name="id" value={employee.id} /> : null}
      {needsApproval ? <p className="text-xs text-muted-foreground">{t("needsApproval")}</p> : null}
      <div className="space-y-1.5">
        <Label htmlFor="emp-name">{t("name")}</Label>
        <Input id="emp-name" name="name" required defaultValue={employee?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="emp-position">{t("position")}</Label>
        <Input id="emp-position" name="position" defaultValue={employee?.position ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="emp-phone">{t("phone")}</Label>
          <Input id="emp-phone" name="phone" defaultValue={employee?.phone ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emp-email">{t("email")}</Label>
          <Input id="emp-email" name="email" type="email" defaultValue={employee?.email ?? ""} />
        </div>
      </div>
      <CurrencyInput
        id="emp-salary"
        name="salary"
        label={t("salary")}
        currencyCode={currencyCode}
        defaultValue={employee?.salary}
        required
      />
      <div className="space-y-1.5">
        <Label htmlFor="emp-join">{t("joiningDate")}</Label>
        <Input id="emp-join" name="joiningDate" type="date" defaultValue={employee?.joiningDate ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="emp-status">{t("status")}</Label>
        <NativeSelect id="emp-status" name="status" defaultValue={employee?.status ?? "ACTIVE"}>
          <option value="ACTIVE">{t("active")}</option>
          <option value="INACTIVE">{t("inactive")}</option>
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="emp-notes">{t("notes")}</Label>
        <Textarea id="emp-notes" name="notes" defaultValue={employee?.notes ?? ""} />
      </div>
    </RecordFormDialog>
  );
}
