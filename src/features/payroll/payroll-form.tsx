"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { savePayrollAction } from "./actions";

export function PayrollFormDialog({
  currencyCode,
  employees,
  payroll,
}: {
  currencyCode: string;
  employees: Array<{ id: string; name: string }>;
  payroll?: {
    id: string;
    employeeId: string;
    periodStart: string;
    periodEnd: string;
    salary: string;
  };
}) {
  const t = useTranslations("payrollPage");
  const tCommon = useTranslations("common");
  return (
    <RecordFormDialog
      title={payroll ? tCommon("edit") : t("add")}
      trigger={
        <Button size={payroll ? "sm" : "default"} variant={payroll ? "outline" : "outline"}>
          {payroll ? tCommon("edit") : t("add")}
        </Button>
      }
      action={savePayrollAction}
    >
      {payroll ? <input type="hidden" name="id" value={payroll.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="pay-emp">{t("employee")}</Label>
        <NativeSelect id="pay-emp" name="employeeId" required defaultValue={payroll?.employeeId ?? ""}>
          <option value="">{t("selectEmployee")}</option>
          {employees.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="pay-start">{t("periodStart")}</Label>
          <Input id="pay-start" name="periodStart" type="date" required defaultValue={payroll?.periodStart} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pay-end">{t("periodEnd")}</Label>
          <Input id="pay-end" name="periodEnd" type="date" required defaultValue={payroll?.periodEnd} />
        </div>
      </div>
      <CurrencyInput
        id="pay-salary"
        name="salary"
        label={t("salary")}
        currencyCode={currencyCode}
        defaultValue={payroll?.salary}
        required
      />
    </RecordFormDialog>
  );
}
