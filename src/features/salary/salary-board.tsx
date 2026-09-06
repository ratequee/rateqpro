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
  allocations: Array<{ projectId: string | null; amount: string; isOperating: boolean }>;
};

export function SalaryBoard({
  currencyCode,
  employees,
  projects,
  payrolls,
}: {
  currencyCode: string;
  employees: Employee[];
  projects: Array<{ id: string; name: string; code: string }>;
  payrolls: PayrollRow[];
}) {
  const t = useTranslations("salaryPage");
  const [periodStart, setPeriodStart] = useState(payrolls[0]?.periodStart ?? todayInputValue().slice(0, 8) + "01");
  const [periodEnd, setPeriodEnd] = useState(payrolls[0]?.periodEnd ?? todayInputValue());

  const rows = useMemo(() => {
    return employees.map((employee, index) => {
      const existing = payrolls.find((row) => row.employeeId === employee.id && row.periodStart === periodStart);
      return { index: index + 1, employee, existing };
    });
  }, [employees, payrolls, periodStart]);

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
          <HorizontalScroll minWidth="1100px" className="rounded-[13px] border border-border bg-card">
            <div className="grid grid-cols-[50px_140px_90px_110px_90px_90px_90px_90px_90px_90px_80px] bg-muted px-3 py-2 text-[11px] font-semibold text-muted-foreground">
              <span>{t("serial")}</span>
              <span>{t("employeeName")}</span>
              <span>{t("employeeId")}</span>
              <span>{t("designation")}</span>
              <span>{t("basic")}</span>
              <span>{t("food")}</span>
              <span>{t("accommodation")}</span>
              <span>{t("overtime")}</span>
              <span>{t("deductions")}</span>
              <span>{t("net")}</span>
              <span />
            </div>
            {rows.map(({ index, employee, existing }) => (
              <div
                key={employee.id}
                className="grid grid-cols-[50px_140px_90px_110px_90px_90px_90px_90px_90px_90px_80px] items-center border-t border-muted px-3 py-2 text-[12px]"
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
                <span className="rounded bg-orange-100 px-1.5 font-bold text-orange-900 dark:bg-orange-950 dark:text-orange-100">
                  {existing?.net ?? employee.salary}
                </span>
                <SalaryRowDialog
                  currencyCode={currencyCode}
                  employee={employee}
                  existing={existing}
                  periodStart={periodStart}
                  periodEnd={periodEnd}
                  projects={projects}
                />
              </div>
            ))}
          </HorizontalScroll>
        </TabsContent>
        <TabsContent value="allocation">
          <HorizontalScroll minWidth={`${900 + projects.length * 110}px`} className="rounded-[13px] border border-border bg-card">
            <div
              className="grid bg-muted px-3 py-2 text-[11px] font-semibold text-muted-foreground"
              style={{ gridTemplateColumns: `160px 90px repeat(${projects.length + 1}, 110px)` }}
            >
              <span>{t("employeeName")}</span>
              <span>{t("net")}</span>
              {projects.map((project) => (
                <span key={project.id}>{project.name}</span>
              ))}
              <span>{t("general")}</span>
            </div>
            {rows.map(({ employee, existing }) => (
              <div
                key={employee.id}
                className="grid items-center border-t border-muted px-3 py-2 text-[12px]"
                style={{ gridTemplateColumns: `160px 90px repeat(${projects.length + 1}, 110px)` }}
              >
                <span className="font-semibold">{employee.name}</span>
                <span>{existing?.net ?? employee.salary}</span>
                {projects.map((project) => {
                  const alloc = existing?.allocations.find((item) => item.projectId === project.id);
                  return <span key={project.id}>{alloc?.amount ?? "0"}</span>;
                })}
                <span>
                  {existing?.allocations.find((item) => item.isOperating)?.amount ?? "0"}
                </span>
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
  projects,
}: {
  currencyCode: string;
  employee: Employee;
  existing?: PayrollRow;
  periodStart: string;
  periodEnd: string;
  projects: Array<{ id: string; name: string; code: string }>;
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
      <Input name="basicSalary" defaultValue={existing?.basicSalary ?? employee.salary} />
      <label className="text-xs">{t("food")}<Input name="foodAllowance" defaultValue={existing?.foodAllowance ?? "0"} /></label>
      <label className="text-xs">{t("accommodation")}<Input name="accommodationAllowance" defaultValue={existing?.accommodationAllowance ?? "0"} /></label>
      <label className="text-xs">{t("overtime")}<Input name="overtime" defaultValue={existing?.overtime ?? "0"} /></label>
      <label className="text-xs">{t("deductions")}<Input name="deductions" defaultValue={existing?.deductions ?? "0"} /></label>
      <p className="text-[11px] text-muted-foreground">{t("allocationHint")} · {currencyCode}</p>
      {projects.map((project) => (
        <label key={project.id} className="text-xs">
          {project.name}
          <Input
            name={`alloc-${project.id}`}
            defaultValue={existing?.allocations.find((item) => item.projectId === project.id)?.amount ?? "0"}
          />
        </label>
      ))}
      <label className="text-xs">
        {t("general")}
        <Input
          name="alloc-GENERAL"
          defaultValue={existing?.allocations.find((item) => item.isOperating)?.amount ?? "0"}
        />
      </label>
      <AllocationsCollector projectIds={projects.map((item) => item.id)} />
    </RecordFormDialog>
  );
}

function AllocationsCollector({ projectIds }: { projectIds: string[] }) {
  return (
    <input
      type="hidden"
      name="allocations"
      value=""
      ref={(node) => {
        if (!node) return;
        const form = node.form;
        if (!form) return;
        const sync = () => {
          const rows = [
            ...projectIds.map((id) => ({
              projectId: id,
              amount: String(new FormData(form).get(`alloc-${id}`) ?? "0"),
              isOperating: false,
            })),
            {
              projectId: null,
              amount: String(new FormData(form).get("alloc-GENERAL") ?? "0"),
              isOperating: true,
            },
          ];
          node.value = JSON.stringify(rows);
        };
        form.addEventListener("submit", sync);
      }}
    />
  );
}
