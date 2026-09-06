import type { ApprovalRequestAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { fromDateInputValue } from "@/lib/formatting/date";
import { nextCodedValue } from "@/features/records/helpers";
import { employeeFormSchema } from "@/lib/validation/records";

export type EmployeeRequestPayload = {
  name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  joiningDate: string | null;
  salary: string;
  status: "ACTIVE" | "INACTIVE";
  notes: string | null;
};

export function employeePayloadFromForm(data: {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  joiningDate?: string;
  salary: string;
  status: "ACTIVE" | "INACTIVE";
  notes?: string;
}): EmployeeRequestPayload {
  return {
    name: data.name,
    position: data.position || null,
    phone: data.phone || null,
    email: data.email || null,
    joiningDate: data.joiningDate || null,
    salary: data.salary,
    status: data.status,
    notes: data.notes || null,
  };
}

export function employeeRequestSummary(
  action: ApprovalRequestAction,
  name: string,
): string {
  if (action === "CREATE") return `Add employee ${name}`;
  if (action === "UPDATE") return `Update employee ${name}`;
  return `Delete employee ${name}`;
}

export async function queueApprovalRequest(input: {
  companyId: string;
  userId: string;
  module: string;
  action: ApprovalRequestAction;
  targetId?: string | null;
  summary: string;
  payload: Prisma.InputJsonValue;
}) {
  if (input.action !== "CREATE" && input.targetId) {
    const existing = await prisma.approvalRequest.findFirst({
      where: {
        ...companyScope(input.companyId),
        module: input.module,
        action: input.action,
        targetId: input.targetId,
        status: "PENDING",
      },
    });
    if (existing) {
      return prisma.approvalRequest.update({
        where: { id: existing.id },
        data: { summary: input.summary, payload: input.payload },
      });
    }
  }

  return prisma.approvalRequest.create({
    data: {
      companyId: input.companyId,
      module: input.module,
      action: input.action,
      targetId: input.targetId ?? null,
      summary: input.summary,
      payload: input.payload,
      requestedById: input.userId,
    },
  });
}

export async function applyEmployeeRequest(input: {
  action: ApprovalRequestAction;
  companyId: string;
  targetId: string | null;
  payload: unknown;
}) {
  if (input.action === "DELETE") {
    if (!input.targetId) return;
    await prisma.$transaction([
      prisma.payroll.deleteMany({
        where: { employeeId: input.targetId, ...companyScope(input.companyId) },
      }),
      prisma.employee.deleteMany({
        where: { id: input.targetId, ...companyScope(input.companyId) },
      }),
    ]);
    return;
  }

  const parsed = employeeFormSchema.safeParse({
    name: (input.payload as EmployeeRequestPayload | null)?.name,
    position: (input.payload as EmployeeRequestPayload | null)?.position ?? "",
    phone: (input.payload as EmployeeRequestPayload | null)?.phone ?? "",
    email: (input.payload as EmployeeRequestPayload | null)?.email ?? "",
    joiningDate: (input.payload as EmployeeRequestPayload | null)?.joiningDate ?? "",
    salary: (input.payload as EmployeeRequestPayload | null)?.salary,
    status: (input.payload as EmployeeRequestPayload | null)?.status ?? "ACTIVE",
    notes: (input.payload as EmployeeRequestPayload | null)?.notes ?? "",
  });
  if (!parsed.success) return;

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

  if (input.action === "UPDATE") {
    if (!input.targetId) return;
    await prisma.employee.updateMany({
      where: { id: input.targetId, ...companyScope(input.companyId) },
      data,
    });
    return;
  }

  const last = await prisma.employee.findFirst({
    where: companyScope(input.companyId),
    orderBy: { createdAt: "desc" },
    select: { employeeNo: true },
  });
  await prisma.employee.create({
    data: {
      companyId: input.companyId,
      employeeNo: nextCodedValue(last?.employeeNo, "EMP"),
      ...data,
    },
  });
}
