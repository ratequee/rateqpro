import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { formatDate } from "@/lib/formatting/date";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AuditLogPage() {
  const user = await requirePermission("auditLog", "view");
  const locale = await getLocale();
  const t = await getTranslations("auditLogPage");
  const rows = await prisma.auditLog.findMany({
    where: companyScope(user.companyId),
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {rows.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <table className="min-w-full text-start text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("date")}</th>
                <th className="px-4 py-3 font-semibold">{t("user")}</th>
                <th className="px-4 py-3 font-semibold">{t("action")}</th>
                <th className="px-4 py-3 font-semibold">{t("module")}</th>
                <th className="px-4 py-3 font-semibold">{t("record")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(row.createdAt, user.dateFormat, locale)}
                  </td>
                  <td className="px-4 py-3">{row.user?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{row.action}</td>
                  <td className="px-4 py-3">{row.module}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.recordId ?? "—"}
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
