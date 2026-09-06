"use server";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { PERMISSION_CATALOG } from "@/lib/permissions/catalog";
import { failState, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";

export async function saveTeamPermissionsAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const actor = await requireUser();
  if (actor.role !== "SUPER_ADMIN") {
    return failState();
  }
  const userId = String(formData.get("userId") ?? "");
  const target = await prisma.user.findFirst({
    where: { id: userId, ...companyScope(actor.companyId) },
  });
  if (!target || target.role === "SUPER_ADMIN") {
    return failState();
  }

  const selected = new Set(formData.getAll("keys").map(String));
  const keys = PERMISSION_CATALOG.map((item) => item.key).filter((key) => selected.has(key));

  try {
    await prisma.userPermission.deleteMany({ where: { userId: target.id } });
    if (keys.length > 0) {
      await prisma.userPermission.createMany({
        data: keys.map((key) => ({ userId: target.id, key, granted: true })),
      });
    }
  } catch (error) {
    console.error("saveTeamPermissionsAction", error);
    return failState();
  }

  await revalidateApp(["/team", "/users", "/dashboard"]);
  return okState();
}
