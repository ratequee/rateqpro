import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default async function UsersPage() {
  const user = await requirePermission("users", "view");
  const t = await getTranslations("users");
  const users = await prisma.user.findMany({
    where: companyScope(user.companyId),
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {users.length === 0 ? (
        <EmptyState title={t("title")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <table className="min-w-full text-start text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("name")}</th>
                <th className="px-4 py-3 font-semibold">{t("email")}</th>
                <th className="px-4 py-3 font-semibold">{t("role")}</th>
                <th className="px-4 py-3 font-semibold">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{t(`roles.${item.role}`)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>
                      {t(`statuses.${item.status}`)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
