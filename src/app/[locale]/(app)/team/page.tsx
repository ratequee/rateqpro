import { getLocale, getTranslations } from "next-intl/server";
import { Shield } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { PERMISSION_CATALOG } from "@/lib/permissions/catalog";
import { PageHeader } from "@/components/ui/page-header";
import { TeamPermissionsForm } from "@/features/team/team-form";

export default async function TeamPage() {
  const user = await requireUser();
  const locale = await getLocale();
  if (user.role !== "SUPER_ADMIN") {
    redirect({ href: "/dashboard", locale: locale as AppLocale });
  }
  const t = await getTranslations("teamPage");
  const members = await prisma.user.findMany({
    where: companyScope(user.companyId),
    orderBy: { name: "asc" },
    include: { permissionGrants: true },
  });

  const modules = [...new Set(PERMISSION_CATALOG.map((item) => item.module))];

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={Shield} />
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      {members
        .filter((member) => member.role !== "SUPER_ADMIN")
        .map((member) => (
          <TeamPermissionsForm
            key={member.id}
            member={{
              id: member.id,
              name: member.name,
              email: member.email,
              role: member.role,
              keys: member.permissionGrants.filter((row) => row.granted).map((row) => row.key),
            }}
            modules={modules}
          />
        ))}
    </div>
  );
}
