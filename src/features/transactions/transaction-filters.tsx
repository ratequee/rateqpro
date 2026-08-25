"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";

type ProjectOption = { id: string; code: string; name: string };

export function TransactionFilters({
  search,
  type,
  status,
  projectId,
  from,
  to,
  projects,
}: {
  search: string;
  type: string;
  status: string;
  projectId: string;
  from: string;
  to: string;
  projects: ProjectOption[];
}) {
  const t = useTranslations("transactions");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(search);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (q) {
        params.set("q", q);
      } else {
        params.delete("q");
      }
      params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(handle);
  }, [q, pathname, router]);

  function update(name: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "ALL") {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card md:grid-cols-2 xl:grid-cols-6">
      <div className="space-y-1 xl:col-span-2">
        <Label htmlFor="q">{tCommon("search")}</Label>
        <Input
          id="q"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t("searchPlaceholder")}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="type">{t("type")}</Label>
        <NativeSelect
          id="type"
          value={type || "ALL"}
          onChange={(event) => update("type", event.target.value)}
        >
          <option value="ALL">{t("allTypes")}</option>
          <option value="DEPOSIT">{t("deposit")}</option>
          <option value="WITHDRAWAL">{t("withdrawal")}</option>
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label htmlFor="status">{t("status")}</Label>
        <NativeSelect
          id="status"
          value={status || "ALL"}
          onChange={(event) => update("status", event.target.value)}
        >
          <option value="ALL">{t("allStatuses")}</option>
          <option value="POSTED">{t("statuses.POSTED")}</option>
          <option value="VOIDED">{t("statuses.VOIDED")}</option>
          <option value="REVERSED">{t("statuses.REVERSED")}</option>
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label htmlFor="projectId">{t("project")}</Label>
        <NativeSelect
          id="projectId"
          value={projectId}
          onChange={(event) => update("projectId", event.target.value)}
        >
          <option value="">{t("allProjects")}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label htmlFor="from">{t("from")}</Label>
        <Input
          id="from"
          type="date"
          defaultValue={from}
          onChange={(event) => update("from", event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to">{t("to")}</Label>
        <Input
          id="to"
          type="date"
          defaultValue={to}
          onChange={(event) => update("to", event.target.value)}
        />
      </div>
    </div>
  );
}
