"use server";

import { requirePermission, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { revalidateApp } from "@/features/records/helpers";
import { syncCompanyAlerts } from "@/lib/finance/alerts";

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
  await syncCompanyAlerts(user.companyId, user.id);
  await revalidateApp(["/notifications", "/approvals"]);
}
