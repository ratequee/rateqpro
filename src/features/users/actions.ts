"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { hashPassword } from "@/lib/auth/password";
import { userFormSchema } from "@/lib/validation/records";
import { failState, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";

export async function saveUserAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const actor = await requirePermission("users", "create");
  const parsed = userFormSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") ?? "",
    role: formData.get("role") ?? "EMPLOYEE",
    status: formData.get("status") ?? "ACTIVE",
  });
  if (!parsed.success) {
    return failState();
  }
  if (!parsed.data.id && !parsed.data.password) {
    return failState();
  }

  try {
    const email = parsed.data.email.toLowerCase();
    if (parsed.data.id) {
      const existing = await prisma.user.findFirst({
        where: { id: parsed.data.id, ...companyScope(actor.companyId) },
      });
      if (!existing) {
        return failState();
      }
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          email,
          role: parsed.data.role,
          status: parsed.data.status,
          ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}),
        },
      });
    } else {
      const created = await prisma.user.create({
        data: {
          companyId: actor.companyId,
          name: parsed.data.name,
          email,
          role: parsed.data.role,
          status: parsed.data.status,
          passwordHash: await hashPassword(parsed.data.password as string),
        },
      });
      await writeAuditLog({
        companyId: actor.companyId,
        userId: actor.id,
        action: "create",
        module: "users",
        recordId: created.id,
        newValue: { email: created.email, role: created.role },
      });
    }
  } catch (error) {
    console.error("saveUserAction", error);
    return failState();
  }

  await revalidateApp(["/users", "/settings"]);
  return okState();
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("users", "delete");
  const id = String(formData.get("id") ?? "");
  if (id === actor.id) {
    return;
  }
  await prisma.user.updateMany({
    where: { id, ...companyScope(actor.companyId) },
    data: { status: "INACTIVE" },
  });
  await prisma.session.deleteMany({ where: { userId: id } });
  await revalidateApp(["/users", "/settings"]);
}
