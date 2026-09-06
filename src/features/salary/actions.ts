"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { fromDateInputValue } from "@/lib/formatting/date";
import { salaryRowSchema } from "@/lib/validation/records";
import { initialRecordStatus } from "@/lib/finance/approval";
import { failState, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";

function money(value: string | undefined) {
  return value && value !== "" ? value : "0";
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

  const net =
    Number(money(parsed.data.basicSalary)) +
    Number(money(parsed.data.foodAllowance)) +
    Number(money(parsed.data.accommodationAllowance)) +
    Number(money(parsed.data.overtime)) -
    Number(money(parsed.data.deductions));

  let allocations: Array<{ projectId: string | null; amount: string; isOperating: boolean }> = [];
  if (parsed.data.allocations) {
    try {
      allocations = JSON.parse(parsed.data.allocations) as typeof allocations;
    } catch {
      return failState();
    }
  }

  const data = {
    employeeId: parsed.data.employeeId,
    periodStart: fromDateInputValue(parsed.data.periodStart),
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
    const payroll = parsed.data.id
      ? await prisma.payroll.update({
          where: { id: parsed.data.id },
          data,
        })
      : await prisma.payroll.create({
          data: { companyId: user.companyId, ...data },
        });

    await prisma.payrollAllocation.deleteMany({ where: { payrollId: payroll.id } });
    if (allocations.length > 0) {
      await prisma.payrollAllocation.createMany({
        data: allocations
          .filter((row) => Number(row.amount) > 0)
          .map((row) => ({
            payrollId: payroll.id,
            projectId: row.isOperating ? null : row.projectId,
            amount: row.amount,
            isOperating: row.isOperating,
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
