import { getLocale, getTranslations } from "next-intl/server";
import { Contact } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getClientsWorkspace } from "@/lib/finance/workspace";
import { formatAmount } from "@/lib/formatting/currency";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusPill } from "@/components/ui/status-pill";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { HorizontalScroll } from "@/components/ui/horizontal-scroll";
import { ClientFormDialog } from "@/features/clients/client-form";
import { DeleteRecordButton } from "@/features/records/delete-button";
import { deleteClientAction } from "@/features/clients/actions";

export default async function ClientsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("clients");
  const clients = await getClientsWorkspace(user.companyId);
  const overdue = clients.reduce((sum, item) => sum + item.outstanding, 0n);
  const contracts = clients.reduce((sum, item) => sum + item.contractValue, 0n);
  const active = clients.filter((item) => item.collected > 0n).length;

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        title={t("title")}
        icon={Contact}
        actions={<ClientFormDialog />}
      />
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <KpiCard accent="brand" label={t("total")} value={String(clients.length)} />
        <KpiCard accent="success" label={t("active")} value={String(active)} valueClassName="text-success" />
        <KpiCard
          accent="warning"
          label={t("overdue")}
          value={formatAmount(overdue, locale)}
          hint={user.currencyCode}
          valueClassName="text-warning"
        />
        <KpiCard
          accent="info"
          label={t("contracts")}
          value={formatAmount(contracts, locale)}
          hint={user.currencyCode}
        />
      </section>
      {clients.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <HorizontalScroll className="rounded-[13px] border border-border bg-card" minWidth="860px">
          <div className="grid grid-cols-[1fr_90px_120px_120px_100px_minmax(140px,auto)] gap-2 bg-muted px-3.5 py-2.5 text-[11px] font-semibold text-muted-foreground">
            <span>{t("client")}</span>
            <span>{t("projectCount")}</span>
            <span>{t("contractValue")}</span>
            <span>{t("collected")}</span>
            <span>{t("status")}</span>
            <span>{t("action")}</span>
          </div>
          {clients.map((client) => (
            <div
              key={client.id}
              className="grid grid-cols-[1fr_90px_120px_120px_100px_minmax(140px,auto)] items-center gap-2 border-b border-muted px-3.5 py-2.5 text-[12.5px] last:border-0"
            >
              <div className="flex items-center gap-2.5">
                <InitialsAvatar name={client.name} tone="info" />
                <div>
                  <div className="text-[13px] font-bold">{client.name}</div>
                  <div className="text-[11px] text-muted-foreground">{client.phone ?? client.email ?? "—"}</div>
                </div>
              </div>
              <span className="text-center">{client.projectCount}</span>
              <span className="font-bold">{formatAmount(client.contractValue, locale)}</span>
              <span className={client.collected > 0n ? "font-bold text-success" : "font-bold text-destructive"}>
                {formatAmount(client.collected, locale)}
              </span>
              {client.outstanding > 0n && client.collected === 0n ? (
                <StatusPill>{t("pending")}</StatusPill>
              ) : client.outstanding > 0n ? (
                <StatusPill>{t("overdue")}</StatusPill>
              ) : (
                <StatusPill variant="success">{t("activeStatus")}</StatusPill>
              )}
              <div className="flex flex-wrap gap-1">
                <ClientFormDialog
                  client={{
                    id: client.id,
                    name: client.name,
                    email: client.email,
                    phone: client.phone,
                    notes: client.notes,
                  }}
                />
                <DeleteRecordButton id={client.id} action={deleteClientAction} />
              </div>
            </div>
          ))}
        </HorizontalScroll>
      )}
    </div>
  );
}
