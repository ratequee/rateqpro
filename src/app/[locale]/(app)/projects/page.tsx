import { getLocale, getTranslations } from "next-intl/server";
import { ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getProjectsWorkspace } from "@/lib/finance/workspace";
import { formatAmount } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { ProjectFormDialog } from "@/features/projects/project-form";
import { ProjectDocumentDialog, ProjectPaymentDialog } from "@/features/projects/project-extras";
import { DeleteRecordButton } from "@/features/records/delete-button";
import { deleteProjectAction } from "@/features/projects/actions";
import { serializeMoney } from "@/features/records/helpers";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";

export default async function ProjectsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("projectsPage");
  const projects = await getProjectsWorkspace(user.companyId);
  const clients = await prisma.client.findMany({
    where: companyScope(user.companyId),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const active = projects.filter((item) => item.status === "ACTIVE").length;
  const contracts = projects.reduce((sum, item) => sum + item.contractValue, 0n);
  const collected = projects.reduce((sum, item) => sum + item.collected, 0n);
  const profit = projects.reduce((sum, item) => sum + item.profit, 0n);

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        title={t("title")}
        icon={ClipboardList}
        actions={<ProjectFormDialog currencyCode={user.currencyCode} clients={clients} />}
      />
      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          accent="success"
          label={t("active")}
          value={String(active)}
          hint={t("of", { total: projects.length })}
        />
        <KpiCard accent="brand" label={t("contracts")} value={formatAmount(contracts, locale)} hint={user.currencyCode} />
        <KpiCard accent="info" label={t("collected")} value={formatAmount(collected, locale)} hint={user.currencyCode} />
        <KpiCard
          accent="success"
          label={t("expectedProfit")}
          value={formatAmount(profit, locale)}
          hint={user.currencyCode}
          valueClassName="text-success"
        />
      </section>
      {projects.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-[13px] border border-border bg-card p-3.5 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-hero"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-primary">
                  {project.code}
                </span>
                <div className="flex items-center gap-1.5">
                  <StatusPill variant={project.status === "COMPLETED" ? "info" : "success"}>
                    {t(`statuses.${project.status}`)}
                  </StatusPill>
                  <ProjectFormDialog
                    currencyCode={user.currencyCode}
                    clients={clients}
                    project={{
                      id: project.id,
                      name: project.name,
                      code: project.code,
                      clientId: project.clientId,
                      contractValue: serializeMoney(project.contractValueInput),
                      status: project.status,
                      notes: project.notes,
                    }}
                  />
                  <DeleteRecordButton id={project.id} action={deleteProjectAction} />
                </div>
              </div>
              <div className="text-sm font-bold">{project.name}</div>
              <div className="mb-2.5 mt-0.5 text-[11.5px] text-muted-foreground">
                {project.clientName ?? t("noClient")}
              </div>
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="text-muted-foreground">{t("collected")}</span>
                <span className="font-bold text-primary">{Math.round(project.collectedPct)}%</span>
              </div>
              <div className="mb-2.5 h-1.5 overflow-hidden rounded bg-muted">
                <div
                  className={cn("h-full rounded", project.collectedPct >= 100 ? "bg-success" : "bg-primary")}
                  style={{ width: `${Math.min(100, project.collectedPct)}%` }}
                />
              </div>
              <div className="mb-2.5 grid grid-cols-3 gap-1.5">
                <Mini label={t("contract")} value={formatAmount(project.contractValue, locale)} />
                <Mini
                  label={t("collected")}
                  value={formatAmount(project.collected, locale)}
                  className={project.collected > 0n ? "text-success" : "text-destructive"}
                />
                <Mini
                  label={t("outstanding")}
                  value={formatAmount(project.outstanding, locale)}
                  className="text-warning"
                />
              </div>
              {project.payments.length > 0 ? (
                <div className="mb-2 space-y-1 text-[11px] text-muted-foreground">
                  {project.payments.map((payment) => (
                    <div key={payment.id}>
                      {t("paymentDue")}: {formatDate(payment.dueDate, user.dateFormat, locale)} ·{" "}
                      {formatAmount(payment.amount.toString(), locale)}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-1">
                <ProjectPaymentDialog projectId={project.id} currencyCode={user.currencyCode} />
                <ProjectDocumentDialog projectId={project.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-[7px] bg-muted px-2 py-1.5">
      <div className="text-[9.5px] text-muted-foreground">{label}</div>
      <div className={cn("text-xs font-bold", className)}>{value}</div>
    </div>
  );
}
