"use server";

import { requirePermission, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { revalidateApp } from "@/features/records/helpers";

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const user = await requirePermission("notifications", "edit");
  const id = String(formData.get("id") ?? "");
  await prisma.notification.updateMany({
    where: { id, ...companyScope(user.companyId) },
    data: { readAt: new Date() },
  });
  await revalidateApp(["/notifications", "/dashboard"]);
}

export async function deleteNotificationAction(formData: FormData): Promise<void> {
  const user = await requirePermission("notifications", "edit");
  const id = String(formData.get("id") ?? "");
  await prisma.notification.deleteMany({
    where: { id, ...companyScope(user.companyId) },
  });
  await revalidateApp(["/notifications"]);
}

export async function refreshAlertsAction(): Promise<void> {
  const user = await requireUser();
  const overdue = await prisma.obligation.findMany({
    where: {
      ...companyScope(user.companyId),
      status: "ACTIVE",
      nextDueDate: { lt: new Date() },
    },
  });
  for (const item of overdue) {
    const exists = await prisma.notification.findFirst({
      where: {
        companyId: user.companyId,
        recordId: item.id,
        type: "OVERDUE_OBLIGATION",
        readAt: null,
      },
    });
    if (exists) {
      continue;
    }
    await prisma.notification.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        type: "OVERDUE_OBLIGATION",
        title: item.name,
        body: `Overdue obligation: ${item.name}`,
        recordId: item.id,
        module: "obligations",
      },
    });
  }
  await revalidateApp(["/notifications", "/approvals"]);
}
