import { getLocale, getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { getEmployeesWorkspace } from "@/lib/finance/workspace";
import { formatAmount } from "@/lib/formatting/currency";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { EmployeeFormDialog } from "@/features/employees/employee-form";
import { EmployeeDocumentDialog, EmployeeDocumentList } from "@/features/employees/document-form";
import { DeleteRecordButton } from "@/features/records/delete-button";
import { deleteEmployeeAction } from "@/features/employees/actions";
import { PayrollFormDialog } from "@/features/payroll/payroll-form";
import { deletePayrollAction } from "@/features/payroll/actions";
import { serializeMoney } from "@/features/records/helpers";
import { formatDate, toDateInputValue } from "@/lib/formatting/date";

export default async function EmployeesPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("employeesPage");
  const [{ employees, payrolls, totalPayroll }, pendingRequests] = await Promise.all([
    getEmployeesWorkspace(user.companyId),
    prisma.approvalRequest.findMany({
      where: { ...companyScope(user.companyId), module: "employees", status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { requestedBy: { select: { name: true } } },
    }),
  ]);
  const active = employees.filter((item) => item.status === "ACTIVE").length;
  const needsApproval = user.role !== "SUPER_ADMIN";

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        title={t("title")}
        icon={Users}
        actions={
          <div className="flex gap-2">
            <EmployeeFormDialog currencyCode={user.currencyCode} needsApproval={needsApproval} />
            <PayrollFormDialog
              currencyCode={user.currencyCode}
              employees={employees.map((item) => ({ id: item.id, name: item.name }))}
            />
          </div>
        }
      />
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <KpiCard accent="brand" label={t("total")} value={String(employees.length)} />
        <KpiCard accent="success" label={t("active")} value={String(active)} valueClassName="text-success" />
        <KpiCard
          accent="warning"
          label={t("inactive")}
          value={String(employees.length - active)}
          valueClassName="text-warning"
        />
        <KpiCard
          accent="brand"
          label={t("payroll")}
          value={formatAmount(totalPayroll, locale)}
          hint={user.currencyCode}
        />
      </section>
      {pendingRequests.length > 0 ? (
        <SectionCard title={t("pendingApproval")}>
          {pendingRequests.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 border-b border-muted py-2 text-[12.5px] last:border-0">
              <div>
                <div className="font-semibold">{item.summary}</div>
                <div className="text-[11px] text-muted-foreground">{item.requestedBy.name}</div>
              </div>
              <span className="text-[11px] font-semibold text-warning">{t("awaitingAdmin")}</span>
            </div>
          ))}
        </SectionCard>
      ) : null}
      {employees.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="grid gap-2.5 md:grid-cols-3">
          {employees.map((employee) => (
            <div key={employee.id} className="rounded-[13px] border border-border bg-card p-3.5">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <InitialsAvatar name={employee.name} tone="info" size="lg" />
                  <div>
                    <div className="text-[13px] font-bold">{employee.name}</div>
                    <div className="text-[11px] text-muted-foreground">{employee.position ?? "—"}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <EmployeeFormDialog
                    currencyCode={user.currencyCode}
                    needsApproval={needsApproval}
                    employee={{
                      id: employee.id,
                      name: employee.name,
                      position: employee.position,
                      phone: employee.phone,
                      email: employee.email,
                      salary: serializeMoney(employee.salary),
                      status: employee.status,
                      notes: employee.notes,
                      joiningDate: employee.joiningDate ? toDateInputValue(employee.joiningDate) : "",
                    }}
                  />
                  <DeleteRecordButton id={employee.id} action={deleteEmployeeAction} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-[7px] bg-muted px-2.5 py-1.5">
                <span className="text-[10px] text-muted-foreground">{t("salary")}</span>
                <span className="text-sm font-bold text-primary">
                  {formatAmount(employee.salary.toString(), locale)} {user.currencyCode}
                </span>
              </div>
              <div className="mt-2 space-y-2">
                <EmployeeDocumentList
                  documents={employee.documents}
                  dateFormat={user.dateFormat}
                  locale={locale}
                />
                <EmployeeDocumentDialog employeeId={employee.id} />
              </div>
            </div>
          ))}
        </div>
      )}
      <SectionCard title={t("payroll")}>
        {payrolls.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("payrollEmpty")}</p>
        ) : (
          payrolls.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-2 border-b border-muted py-2 text-[12.5px] last:border-0">
              <div className="min-w-0">
                <div className="font-semibold">{row.employee.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {formatDate(row.periodStart, user.dateFormat, locale)}
                  {Number(row.foodAllowance.toString()) > 0
                    ? ` · ${t("food")} ${serializeMoney(row.foodAllowance)}`
                    : ""}
                  {Number(row.accommodationAllowance.toString()) > 0
                    ? ` · ${t("accommodation")} ${serializeMoney(row.accommodationAllowance)}`
                    : ""}
                </div>
              </div>
              <span className="font-bold text-primary">
                {formatAmount(row.salary.toString(), locale)} {user.currencyCode}
              </span>
              <div className="flex items-center gap-1">
                <PayrollFormDialog
                  currencyCode={user.currencyCode}
                  employees={employees.map((item) => ({ id: item.id, name: item.name }))}
                  payroll={{
                    id: row.id,
                    employeeId: row.employeeId,
                    periodStart: toDateInputValue(row.periodStart),
                    periodEnd: toDateInputValue(row.periodEnd),
                    salary: serializeMoney(row.salary),
                  }}
                />
                <DeleteRecordButton id={row.id} action={deletePayrollAction} />
              </div>
            </div>
          ))
        )}
      </SectionCard>
    </div>
  );
}
