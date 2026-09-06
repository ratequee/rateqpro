import { getLocale, getTranslations } from "next-intl/server";
import { Wallet } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { formatAmount } from "@/lib/formatting/currency";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { SalaryBoard } from "@/features/salary/salary-board";
import { serializeMoney } from "@/features/records/helpers";
import { toDateInputValue } from "@/lib/formatting/date";

export default async function SalaryPage() {
  const user = await requirePermission("payroll", "view");
  const locale = await getLocale();
  const t = await getTranslations("salaryPage");
  const [employees, clients, projects, payrolls] = await Promise.all([
    prisma.employee.findMany({
      where: { ...companyScope(user.companyId), status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: companyScope(user.companyId),
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: companyScope(user.companyId),
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.payroll.findMany({
      where: companyScope(user.companyId),
      orderBy: { updatedAt: "desc" },
      include: {
        employee: { select: { name: true, employeeNo: true, position: true } },
        allocations: true,
      },
    }),
  ]);
  const serviceColumns = [
    ...clients.map((item) => ({ key: `client:${item.id}`, label: item.name })),
    ...projects.map((item) => ({ key: `project:${item.id}`, label: item.name })),
    { key: "GENERAL", label: t("general") },
  ];

  const seen = new Set<string>();
  const uniquePayrolls = payrolls.filter((row) => {
    const key = `${row.employeeId}-${toDateInputValue(row.periodStart).slice(0, 7)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const posted = uniquePayrolls.filter((row) => row.status === "POSTED");
  const net = posted.reduce((sum, row) => sum + Number(row.salary.toString()), 0);
  const deductions = posted.reduce((sum, row) => sum + Number(row.deductions.toString()), 0);

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={Wallet} />
      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard accent="success" label={t("totalSalaries")} value={formatAmount(net + deductions, locale)} hint="QAR" />
        <KpiCard accent="danger" label={t("totalDeductions")} value={formatAmount(deductions, locale)} hint="QAR" />
        <KpiCard accent="brand" label={t("netPayouts")} value={formatAmount(net, locale)} hint="QAR" />
      </section>
      <SalaryBoard
        currencyCode={user.currencyCode}
        employees={employees.map((item) => ({
          id: item.id,
          name: item.name,
          employeeNo: item.employeeNo,
          position: item.position,
          salary: serializeMoney(item.salary),
        }))}
        serviceColumns={serviceColumns}
        payrolls={uniquePayrolls.map((row) => ({
          id: row.id,
          employeeId: row.employeeId,
          employeeName: row.employee.name,
          employeeNo: row.employee.employeeNo,
          position: row.employee.position,
          periodStart: toDateInputValue(row.periodStart),
          periodEnd: toDateInputValue(row.periodEnd),
          basicSalary: serializeMoney(row.basicSalary),
          foodAllowance: serializeMoney(row.foodAllowance),
          accommodationAllowance: serializeMoney(row.accommodationAllowance),
          overtime: serializeMoney(row.overtime),
          deductions: serializeMoney(row.deductions),
          net: serializeMoney(row.salary),
          status: row.status,
          services: Object.fromEntries(
            row.allocations.map((item) => [
              item.isOperating
                ? "GENERAL"
                : item.notes?.startsWith("client:") || item.notes?.startsWith("project:")
                  ? item.notes
                  : item.projectId
                    ? `project:${item.projectId}`
                    : "GENERAL",
              serializeMoney(item.amount),
            ]),
          ),
        }))}
      />
    </div>
  );
}
