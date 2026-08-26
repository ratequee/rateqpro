"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { fromDateInputValue } from "@/lib/formatting/date";
import { projectFormSchema } from "@/lib/validation/records";
import { failState, nextCodedValue, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";

export async function saveProjectAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("projects", "create");
  const parsed = projectFormSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    code: formData.get("code") ?? "",
    clientId: formData.get("clientId") ?? "",
    contractValue: formData.get("contractValue"),
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
    status: formData.get("status") ?? "PLANNED",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return failState();
  }

  if (parsed.data.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, ...companyScope(user.companyId) },
    });
    if (!client) {
      return failState();
    }
  }

  try {
    const last = await prisma.project.findFirst({
      where: companyScope(user.companyId),
      orderBy: { createdAt: "desc" },
      select: { code: true },
    });
    const code = parsed.data.code || nextCodedValue(last?.code, "PRJ");
    const payload = {
      name: parsed.data.name,
      code,
      clientId: parsed.data.clientId || null,
      contractValue: parsed.data.contractValue,
      startDate: parsed.data.startDate ? fromDateInputValue(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? fromDateInputValue(parsed.data.endDate) : null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    };

    if (parsed.data.id) {
      const existing = await prisma.project.findFirst({
        where: { id: parsed.data.id, ...companyScope(user.companyId) },
      });
      if (!existing) {
        return failState();
      }
      await prisma.project.update({ where: { id: existing.id }, data: payload });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "update",
        module: "projects",
        recordId: existing.id,
        newValue: { ...payload, contractValue: parsed.data.contractValue },
      });
    } else {
      const created = await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: { companyId: user.companyId, ...payload },
        });
        if (Number(parsed.data.contractValue) > 0) {
          const lastContract = await tx.contract.findFirst({
            where: companyScope(user.companyId),
            orderBy: { createdAt: "desc" },
            select: { number: true },
          });
          await tx.contract.create({
            data: {
              companyId: user.companyId,
              projectId: project.id,
              clientId: payload.clientId,
              number: nextCodedValue(lastContract?.number, "CT"),
              value: parsed.data.contractValue,
              contractDate: payload.startDate ?? new Date(),
              startDate: payload.startDate,
              endDate: payload.endDate,
            },
          });
        }
        return project;
      });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "create",
        module: "projects",
        recordId: created.id,
        newValue: { ...payload, contractValue: parsed.data.contractValue },
      });
    }
  } catch (error) {
    console.error("saveProjectAction", error);
    return failState();
  }

  await revalidateApp(["/projects", "/clients", "/dashboard", "/contracts"]);
  return okState();
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  const user = await requirePermission("projects", "delete");
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.project.findFirst({
    where: { id, ...companyScope(user.companyId) },
  });
  if (!existing) {
    return;
  }
  await prisma.$transaction([
    prisma.contract.deleteMany({ where: { projectId: id, ...companyScope(user.companyId) } }),
    prisma.project.delete({ where: { id } }),
  ]);
  await writeAuditLog({
    companyId: user.companyId,
    userId: user.id,
    action: "delete",
    module: "projects",
    recordId: id,
  });
  await revalidateApp(["/projects", "/clients", "/dashboard", "/contracts"]);
}
