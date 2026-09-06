"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { fromDateInputValue } from "@/lib/formatting/date";
import { periodMonthStart } from "@/lib/finance/payroll-period";
import { payrollFormSchema } from "@/lib/validation/records";
import { failState, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";
import { initialRecordStatus } from "@/lib/finance/approval";

async function touch() {
  await revalidateApp(["/employees", "/payroll", "/dashboard", "/approvals", "/salary"]);
}

export async function savePayrollAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("payroll", "create");
  const parsed = payrollFormSchema.safeParse({
    id: formData.get("id") ?? "",
    employeeId: formData.get("employeeId"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    salary: formData.get("salary"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return failState();
  }

  const employee = await prisma.employee.findFirst({
    where: { id: parsed.data.employeeId, ...companyScope(user.companyId) },
  });
  if (!employee) {
    return failState();
  }

  const periodStart = periodMonthStart(fromDateInputValue(parsed.data.periodStart));
  const data = {
    employeeId: employee.id,
    periodStart,
    periodEnd: fromDateInputValue(parsed.data.periodEnd),
    salary: parsed.data.salary,
    basicSalary: parsed.data.salary,
    notes: parsed.data.notes || null,
    userId: user.id,
    status: initialRecordStatus(user.role),
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
          employeeId: employee.id,
          periodStart,
        },
      }));

    if (existing) {
      await prisma.payroll.update({ where: { id: existing.id }, data });
      await prisma.payroll.deleteMany({
        where: {
          ...companyScope(user.companyId),
          employeeId: employee.id,
          periodStart,
          id: { not: existing.id },
        },
      });
    } else {
      const created = await prisma.payroll.create({
        data: { companyId: user.companyId, ...data },
      });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "create",
        module: "payroll",
        recordId: created.id,
        newValue: { employeeId: employee.id, salary: parsed.data.salary },
      });
    }
  } catch (error) {
    console.error("savePayrollAction", error);
    return failState();
  }

  await touch();
  return okState();
}

export async function deletePayrollAction(formData: FormData): Promise<void> {
  const user = await requirePermission("payroll", "delete");
  const id = String(formData.get("id") ?? "");
  await prisma.payroll.deleteMany({
    where: { id, ...companyScope(user.companyId) },
  });
  await touch();
}
