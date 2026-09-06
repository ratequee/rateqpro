"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HorizontalScroll } from "@/components/ui/horizontal-scroll";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { saveSalaryRowAction } from "./actions";
import { todayInputValue } from "@/lib/formatting/date";

type Employee = {
  id: string;
  name: string;
  employeeNo: string;
  position: string | null;
  salary: string;
};

type ServiceColumn = { key: string; label: string };

type PayrollRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  position: string | null;
  periodStart: string;
  periodEnd: string;
  basicSalary: string;
  foodAllowance: string;
  accommodationAllowance: string;
  overtime: string;
  deductions: string;
  net: string;
  status: string;
  services: Record<string, string>;
};

export function SalaryBoard({
  currencyCode,
  employees,
  serviceColumns,
  payrolls,
}: {
  currencyCode: string;
  employees: Employee[];
  serviceColumns: ServiceColumn[];
  payrolls: PayrollRow[];
}) {
  const t = useTranslations("salaryPage");
  const [periodStart, setPeriodStart] = useState(payrolls[0]?.periodStart ?? `${todayInputValue().slice(0, 8)}01`);
  const [periodEnd, setPeriodEnd] = useState(payrolls[0]?.periodEnd ?? todayInputValue());

  const rows = useMemo(() => {
    const month = periodStart.slice(0, 7);
    return employees.map((employee, index) => {
      const existing = payrolls.find(
        (row) => row.employeeId === employee.id && row.periodStart.slice(0, 7) === month,
      );
      return { index: index + 1, employee, existing };
    });
  }, [employees, payrolls, periodStart]);

  const registerTemplate = `50px 140px 90px 110px 90px 90px 90px 90px 90px ${serviceColumns.map(() => "110px").join(" ")} 90px 80px`;
  const allocTemplate = `160px 90px ${serviceColumns.map(() => "110px").join(" ")}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          {t("periodStart")}
          <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
        </label>
        <label className="text-xs">
          {t("periodEnd")}
          <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
        </label>
      </div>
      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">{t("registerTab")}</TabsTrigger>
          <TabsTrigger value="allocation">{t("allocationTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="register">
          <HorizontalScroll minWidth={`${1100 + serviceColumns.length * 110}px`} className="rounded-[13px] border border-border bg-card">
            <div
              className="grid bg-muted px-3 py-2 text-[11px] font-semibold text-muted-foreground"
              style={{ gridTemplateColumns: registerTemplate }}
            >
              <span>{t("serial")}</span>
              <span>{t("employeeName")}</span>
              <span>{t("employeeId")}</span>
              <span>{t("designation")}</span>
              <span>{t("basic")}</span>
              <span>{t("food")}</span>
              <span>{t("accommodation")}</span>
              <span>{t("overtime")}</span>
              <span>{t("deductions")}</span>
              {serviceColumns.map((column) => (
                <span key={column.key}>{column.label}</span>
              ))}
              <span>{t("net")}</span>
              <span />
            </div>
            {rows.map(({ index, employee, existing }) => (
              <div
                key={employee.id}
                className="grid items-center border-t border-muted px-3 py-2 text-[12px]"
                style={{ gridTemplateColumns: registerTemplate }}
              >
                <span>{index}</span>
                <span className="rounded bg-wn-bg px-1.5 py-0.5 font-semibold">{employee.name}</span>
                <span>{employee.employeeNo}</span>
                <span className="text-destructive">{employee.position ?? "—"}</span>
                <span>{existing?.basicSalary ?? employee.salary}</span>
                <span>{existing?.foodAllowance ?? "0"}</span>
                <span>{existing?.accommodationAllowance ?? "0"}</span>
                <span>{existing?.overtime ?? "0"}</span>
                <span>{existing?.deductions ?? "0"}</span>
                {serviceColumns.map((column) => (
                  <span key={column.key}>{existing?.services[column.key] ?? "0"}</span>
                ))}
                <span className="rounded bg-orange-100 px-1.5 font-bold text-orange-900 dark:bg-orange-950 dark:text-orange-100">
                  {existing?.net ?? employee.salary}
                </span>
                <SalaryRowDialog
                  currencyCode={currencyCode}
                  employee={employee}
                  existing={existing}
                  periodStart={periodStart}
                  periodEnd={periodEnd}
                  serviceColumns={serviceColumns}
                />
              </div>
            ))}
          </HorizontalScroll>
        </TabsContent>
        <TabsContent value="allocation">
          <HorizontalScroll minWidth={`${400 + serviceColumns.length * 110}px`} className="rounded-[13px] border border-border bg-card">
            <div
              className="grid bg-muted px-3 py-2 text-[11px] font-semibold text-muted-foreground"
              style={{ gridTemplateColumns: allocTemplate }}
            >
              <span>{t("employeeName")}</span>
              <span>{t("net")}</span>
              {serviceColumns.map((column) => (
                <span key={column.key}>{column.label}</span>
              ))}
            </div>
            {rows.map(({ employee, existing }) => (
              <div
                key={employee.id}
                className="grid items-center border-t border-muted px-3 py-2 text-[12px]"
                style={{ gridTemplateColumns: allocTemplate }}
              >
                <span className="font-semibold">{employee.name}</span>
                <span>{existing?.net ?? employee.salary}</span>
                {serviceColumns.map((column) => (
                  <span key={column.key}>{existing?.services[column.key] ?? "0"}</span>
                ))}
              </div>
            ))}
          </HorizontalScroll>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SalaryRowDialog({
  currencyCode,
  employee,
  existing,
  periodStart,
  periodEnd,
  serviceColumns,
}: {
  currencyCode: string;
  employee: Employee;
  existing?: PayrollRow;
  periodStart: string;
  periodEnd: string;
  serviceColumns: ServiceColumn[];
}) {
  const t = useTranslations("salaryPage");
  const tCommon = useTranslations("common");
  return (
    <RecordFormDialog
      title={`${t("editRow")} · ${employee.name}`}
      trigger={
        <Button size="sm" variant="outline">
          {tCommon("edit")}
        </Button>
      }
      action={saveSalaryRowAction}
    >
      {existing ? <input type="hidden" name="id" value={existing.id} /> : null}
      <input type="hidden" name="employeeId" value={employee.id} />
      <input type="hidden" name="periodStart" value={periodStart} />
      <input type="hidden" name="periodEnd" value={periodEnd} />
      <label className="text-xs">
        {t("basic")}
        <Input name="basicSalary" defaultValue={existing?.basicSalary ?? employee.salary} />
      </label>
      <label className="text-xs">
        {t("food")}
        <Input name="foodAllowance" defaultValue={existing?.foodAllowance ?? "0"} />
      </label>
      <label className="text-xs">
        {t("accommodation")}
        <Input name="accommodationAllowance" defaultValue={existing?.accommodationAllowance ?? "0"} />
      </label>
      <label className="text-xs">
        {t("overtime")}
        <Input name="overtime" defaultValue={existing?.overtime ?? "0"} />
      </label>
      <label className="text-xs">
        {t("deductions")}
        <Input name="deductions" defaultValue={existing?.deductions ?? "0"} />
      </label>
      <p className="text-[11px] text-muted-foreground">
        {t("allocationHint")} · {currencyCode}
      </p>
      {serviceColumns.map((column) => (
        <label key={column.key} className="text-xs">
          {column.label}
          <Input
            name={column.key === "GENERAL" ? "alloc-GENERAL" : `service-${column.key}`}
            defaultValue={existing?.services[column.key] ?? "0"}
          />
        </label>
      ))}
    </RecordFormDialog>
  );
}
