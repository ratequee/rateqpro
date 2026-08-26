import { Files } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DocumentsPage() {
  await requireUser();
  const t = await getTranslations("documentsPage");
  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={Files} />
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <KpiCard accent="danger" label={t("expired")} value="0" valueClassName="text-destructive" />
        <KpiCard accent="warning" label={t("expiring")} value="0" valueClassName="text-warning" />
        <KpiCard accent="success" label={t("valid")} value="0" valueClassName="text-success" />
        <KpiCard accent="none" label={t("total")} value="0" />
      </section>
      <EmptyState title={t("empty")} />
    </div>
  );
}
