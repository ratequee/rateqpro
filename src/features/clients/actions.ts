"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { clientFormSchema } from "@/lib/validation/records";
import { failState, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";

async function touch() {
  await revalidateApp(["/clients", "/projects", "/dashboard"]);
}

export async function saveClientAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("projects", "create");
  const parsed = clientFormSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return failState();
  }

  const data = {
    name: parsed.data.name,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    notes: parsed.data.notes || null,
  };

  try {
    if (parsed.data.id) {
      const existing = await prisma.client.findFirst({
        where: { id: parsed.data.id, ...companyScope(user.companyId) },
      });
      if (!existing) {
        return failState();
      }
      await prisma.client.update({ where: { id: existing.id }, data });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "update",
        module: "clients",
        recordId: existing.id,
        newValue: data,
      });
    } else {
      const created = await prisma.client.create({
        data: { companyId: user.companyId, ...data },
      });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "create",
        module: "clients",
        recordId: created.id,
        newValue: data,
      });
    }
  } catch (error) {
    console.error("saveClientAction", error);
    return failState();
  }

  await touch();
  return okState();
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  const user = await requirePermission("projects", "delete");
  const id = String(formData.get("id") ?? "");
  await prisma.client.deleteMany({
    where: { id, ...companyScope(user.companyId) },
  });
  await writeAuditLog({
    companyId: user.companyId,
    userId: user.id,
    action: "delete",
    module: "clients",
    recordId: id,
  });
  await touch();
}
