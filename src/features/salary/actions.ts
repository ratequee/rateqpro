"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { fromDateInputValue } from "@/lib/formatting/date";
import { salaryRowSchema } from "@/lib/validation/records";
import { initialRecordStatus } from "@/lib/finance/approval";
import { periodMonthStart } from "@/lib/finance/payroll-period";
import { failState, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";

function money(value: string | undefined) {
  return value && value !== "" ? value : "0";
}

type ServiceRow = { key: string; amount: string; isOperating: boolean };

function parseServices(formData: FormData): ServiceRow[] {
  const rows: ServiceRow[] = [];
  for (const [name, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (name === "alloc-GENERAL") {
      rows.push({ key: "GENERAL", amount: money(value), isOperating: true });
      continue;
    }
    if (name.startsWith("service-")) {
      rows.push({ key: name.slice("service-".length), amount: money(value), isOperating: false });
    }
  }
  return rows;
}

export async function saveSalaryRowAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("payroll", "create");
  const parsed = salaryRowSchema.safeParse({
    id: formData.get("id") ?? "",
    employeeId: formData.get("employeeId"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    basicSalary: formData.get("basicSalary"),
    foodAllowance: formData.get("foodAllowance") ?? "0",
    accommodationAllowance: formData.get("accommodationAllowance") ?? "0",
    overtime: formData.get("overtime") ?? "0",
    deductions: formData.get("deductions") ?? "0",
    allocations: formData.get("allocations") ?? "",
  });
  if (!parsed.success) {
    return failState();
  }

  const services = parseServices(formData);
  const serviceTotal = services.reduce((sum, row) => sum + Number(row.amount), 0);
  const net =
    Number(money(parsed.data.basicSalary)) +
    Number(money(parsed.data.foodAllowance)) +
    Number(money(parsed.data.accommodationAllowance)) +
    Number(money(parsed.data.overtime)) +
    serviceTotal -
    Number(money(parsed.data.deductions));

  const periodStart = periodMonthStart(fromDateInputValue(parsed.data.periodStart));
  const data = {
    employeeId: parsed.data.employeeId,
    periodStart,
    periodEnd: fromDateInputValue(parsed.data.periodEnd),
    basicSalary: money(parsed.data.basicSalary),
    foodAllowance: money(parsed.data.foodAllowance),
    accommodationAllowance: money(parsed.data.accommodationAllowance),
    overtime: money(parsed.data.overtime),
    deductions: money(parsed.data.deductions),
    salary: net.toFixed(2),
    status: initialRecordStatus(user.role),
    userId: user.id,
  };

  try {
    const existing =
      (parsed.data.id
        ? await prisma.payroll.findFirst({
            where: { id: parsed.data.id, ...companyScope(user.companyId) },
          })
        : null) ??
      (await prisma.payroll.findFirst({
        where: {
          ...companyScope(user.companyId),
          employeeId: parsed.data.employeeId,
          periodStart,
        },
      }));

    const payroll = existing
      ? await prisma.payroll.update({ where: { id: existing.id }, data })
      : await prisma.payroll.create({
          data: { companyId: user.companyId, ...data },
        });

    await prisma.payroll.deleteMany({
      where: {
        ...companyScope(user.companyId),
        employeeId: parsed.data.employeeId,
        periodStart,
        id: { not: payroll.id },
      },
    });

    await prisma.payrollAllocation.deleteMany({ where: { payrollId: payroll.id } });
    const allocationRows = services.filter((row) => Number(row.amount) > 0);
    if (allocationRows.length > 0) {
      await prisma.payrollAllocation.createMany({
        data: allocationRows.map((row) => ({
          payrollId: payroll.id,
          projectId: row.isOperating || row.key.startsWith("client:") ? null : row.key.replace(/^project:/, ""),
          amount: row.amount,
          isOperating: row.isOperating,
          notes: row.isOperating ? "GENERAL" : row.key,
        })),
      });
    }
  } catch (error) {
    console.error("saveSalaryRowAction", error);
    return failState();
  }

  await revalidateApp(["/salary", "/employees", "/approvals", "/payroll"]);
  return okState();
}
