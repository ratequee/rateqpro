"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { fromDateInputValue } from "@/lib/formatting/date";
import { employeeFormSchema } from "@/lib/validation/records";
import { failState, nextCodedValue, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";

export async function saveEmployeeAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("employees", "create");
  const parsed = employeeFormSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    position: formData.get("position") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    joiningDate: formData.get("joiningDate") ?? "",
    salary: formData.get("salary"),
    status: formData.get("status") ?? "ACTIVE",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return failState();
  }

  try {
    const last = await prisma.employee.findFirst({
      where: companyScope(user.companyId),
      orderBy: { createdAt: "desc" },
      select: { employeeNo: true },
    });
    const data = {
      name: parsed.data.name,
      position: parsed.data.position || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      joiningDate: parsed.data.joiningDate ? fromDateInputValue(parsed.data.joiningDate) : null,
      salary: parsed.data.salary,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    };
    if (parsed.data.id) {
      const existing = await prisma.employee.findFirst({
        where: { id: parsed.data.id, ...companyScope(user.companyId) },
      });
      if (!existing) {
        return failState();
      }
      await prisma.employee.update({ where: { id: existing.id }, data });
    } else {
      const created = await prisma.employee.create({
        data: {
          companyId: user.companyId,
          employeeNo: nextCodedValue(last?.employeeNo, "EMP"),
          ...data,
        },
      });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "create",
        module: "employees",
        recordId: created.id,
        newValue: { name: created.name, salary: parsed.data.salary },
      });
    }
  } catch (error) {
    console.error("saveEmployeeAction", error);
    return failState();
  }

  await revalidateApp(["/employees", "/payroll", "/dashboard"]);
  return okState();
}

export async function deleteEmployeeAction(formData: FormData): Promise<void> {
  const user = await requirePermission("employees", "delete");
  const id = String(formData.get("id") ?? "");
  await prisma.$transaction([
    prisma.payroll.deleteMany({ where: { employeeId: id, ...companyScope(user.companyId) } }),
    prisma.employee.deleteMany({ where: { id, ...companyScope(user.companyId) } }),
  ]);
  await writeAuditLog({
    companyId: user.companyId,
    userId: user.id,
    action: "delete",
    module: "employees",
    recordId: id,
  });
  await revalidateApp(["/employees", "/payroll", "/dashboard"]);
}
