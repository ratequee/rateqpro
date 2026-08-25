import { getTranslations } from "next-intl/server";
import type { UserRole } from "@prisma/client";
import { requirePermission } from "@/lib/auth/guards";
import { permissionsForRole } from "@/lib/permissions/check";
import { PERMISSION_MODULES } from "@/lib/permissions/catalog";
import { PageHeader } from "@/components/ui/page-header";

const roles: UserRole[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE"];

export default async function RolesPage() {
  await requirePermission("roles", "view");
  const t = await getTranslations("rolesPage");
  const tUsers = await getTranslations("users");

  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="min-w-full text-start text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-semibold">{t("role")}</th>
              <th className="px-4 py-3 font-semibold">{t("permissions")}</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => {
              const keys = permissionsForRole(role);
              return (
                <tr key={role} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3 font-medium">{tUsers(`roles.${role}`)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {PERMISSION_MODULES.map((module) => {
                      const moduleKeys = keys.filter((key) => key.startsWith(`${module}.`));
                      if (moduleKeys.length === 0) {
                        return null;
                      }
                      return (
                        <div key={module} className="mb-1">
                          <span className="font-medium text-foreground">{module}</span>
                          {": "}
                          {moduleKeys
                            .map((key) => key.split(".")[1])
                            .join(", ")}
                        </div>
                      );
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
