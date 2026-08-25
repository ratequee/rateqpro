import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, type CurrentUser } from "./current-user";
import type { PermissionAction, PermissionModule } from "@/lib/permissions/catalog";
import { hasPermission } from "@/lib/permissions/check";

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

export async function requirePermission(
  module: PermissionModule,
  action: PermissionAction,
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasPermission(user.role, module, action)) {
    const locale = await getLocale();
    redirect({ href: "/dashboard", locale });
    throw new Error("FORBIDDEN");
  }
  return user;
}
