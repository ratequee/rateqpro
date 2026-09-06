"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { saveTeamPermissionsAction } from "./actions";
import type { PermissionModule } from "@/lib/permissions/catalog";

export function TeamPermissionsForm({
  member,
  modules,
}: {
  member: { id: string; name: string; email: string; role: string; keys: string[] };
  modules: PermissionModule[];
}) {
  const t = useTranslations("teamPage");
  const tUsers = useTranslations("users");
  const granted = new Set(member.keys);
  const usingCustom = member.keys.length > 0;

  return (
    <SectionCard title={`${member.name} · ${member.email}`}>
      <p className="mb-3 text-[11px] text-muted-foreground">
        {tUsers(`roles.${member.role as "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE"}`)} · {usingCustom ? t("customAccess") : t("roleDefault")}
      </p>
      <RecordFormDialog
        title={t("editAccess")}
        trigger={<Button size="sm">{t("editAccess")}</Button>}
        action={saveTeamPermissionsAction}
      >
        <input type="hidden" name="userId" value={member.id} />
        <p className="text-[11px] text-muted-foreground">{t("formHint")}</p>
        <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1">
          {modules.map((module) => (
            <label key={module} className="flex items-start gap-2 rounded-lg border border-border px-2.5 py-2 text-sm">
              <input
                type="checkbox"
                name="keys"
                value={`${module}.view`}
                defaultChecked={granted.has(`${module}.view`) || (!usingCustom && member.role !== "EMPLOYEE")}
                className="mt-0.5 size-4"
              />
              <span>
                <span className="font-semibold">{t(`tabs.${module}`)}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {t(`tabHints.${module}`)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </RecordFormDialog>
    </SectionCard>
  );
}
