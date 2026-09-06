import { getLocale, getTranslations } from "next-intl/server";
import { Car, Package } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getAssetsWorkspace } from "@/lib/finance/workspace";
import { formatAmount } from "@/lib/formatting/currency";
import { formatDate, toDateInputValue } from "@/lib/formatting/date";
import { serializeMoney } from "@/features/records/helpers";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { HorizontalScroll } from "@/components/ui/horizontal-scroll";
import { AssetFormDialog, CashAdvanceFormDialog } from "@/features/assets/asset-form";
import { SettleCashAdvanceButton } from "@/features/assets/settle-button";
import { DeleteRecordButton } from "@/features/records/delete-button";
import { deleteAssetAction, deleteCashAdvanceAction } from "@/features/assets/actions";
import type { AssetCategory } from "@prisma/client";

export default async function AssetsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("assetsPage");
  const data = await getAssetsWorkspace(user.companyId);

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        title={t("title")}
        icon={Package}
        actions={
          <div className="flex gap-2">
            <AssetFormDialog currencyCode={user.currencyCode} />
            <CashAdvanceFormDialog currencyCode={user.currencyCode} />
          </div>
        }
      />
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <KpiCard
          accent="brand"
          label={t("total")}
          value={formatAmount(data.totalValue, locale)}
          hint={user.currencyCode}
        />
        <KpiCard accent="warning" label={t("vehicles")} value={String(data.vehicles.length)} />
        <KpiCard accent="info" label={t("equipment")} value={String(data.equipment.length)} />
        <KpiCard
          accent="success"
          label={t("openCustody")}
          value={formatAmount(data.openCustody, locale)}
          hint={user.currencyCode}
          valueClassName="text-warning"
        />
      </section>
      <SectionCard title={t("vehicles")} icon={Car}>
        {data.vehicles.length === 0 && data.assets.length === 0 ? (
          <EmptyState title={t("empty")} className="border-0 px-0 py-6 shadow-none" />
        ) : (
          <div className="grid gap-2.5 md:grid-cols-3">
            {data.assets.map((asset) => (
              <div key={asset.id} className="rounded-[13px] border border-border p-3.5 hover:border-primary/40 hover:shadow-hero">
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-10 items-center justify-center rounded-[9px] bg-brand-soft text-primary">
                      <Car className="size-5" />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold">{asset.name}</div>
                      <div className="text-[11px] text-muted-foreground">{asset.category}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <AssetFormDialog
                      currencyCode={user.currencyCode}
                      asset={{
                        id: asset.id,
                        name: asset.name,
                        category: asset.category as AssetCategory,
                        purchaseValue: serializeMoney(asset.purchaseValue),
                        purchaseDate: asset.purchaseDate ? toDateInputValue(asset.purchaseDate) : "",
                        notes: asset.notes,
                        status: asset.status,
                      }}
                    />
                    <DeleteRecordButton id={asset.id} action={deleteAssetAction} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded-[7px] bg-muted px-2 py-1.5">
                    <div className="text-[9.5px] text-muted-foreground">{t("value")}</div>
                    <div className="text-xs font-bold">
                      {formatAmount(asset.currentValue.toString(), locale)}
                    </div>
                  </div>
                  <div className="rounded-[7px] bg-muted px-2 py-1.5">
                    <div className="text-[9.5px] text-muted-foreground">{t("year")}</div>
                    <div className="text-xs font-bold">
                      {asset.purchaseDate ? asset.purchaseDate.getUTCFullYear() : "—"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      <SectionCard title={t("custody")}>
        {data.advances.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("custodyEmpty")}</p>
        ) : (
          <>
            <HorizontalScroll className="rounded-[10px] border border-border" minWidth="780px">
              <div className="grid grid-cols-[1fr_100px_100px_100px_minmax(160px,auto)] bg-muted px-3.5 py-2 text-[11px] font-semibold text-muted-foreground">
                <span>{t("employee")}</span>
                <span>{t("amount")}</span>
                <span>{t("date")}</span>
                <span>{t("status")}</span>
                <span />
              </div>
              {data.advances.map((advance) => (
                <div
                  key={advance.id}
                  className="grid grid-cols-[1fr_100px_100px_100px_minmax(160px,auto)] items-center border-t border-muted px-3.5 py-2.5 text-[12.5px]"
                >
                  <div className="flex items-center gap-2">
                    <InitialsAvatar name={advance.personName} size="sm" />
                    <span className="font-semibold">{advance.personName}</span>
                  </div>
                  <span className="font-bold text-primary">
                    {formatAmount(advance.amountIssued.toString(), locale)}
                  </span>
                  <span>{formatDate(advance.issueDate, user.dateFormat, locale)}</span>
                  <StatusPill variant={advance.status === "SETTLED" ? "success" : "pending"}>
                    {t(`statuses.${advance.status}`)}
                  </StatusPill>
                  <div className="flex flex-wrap gap-1">
                    {advance.status !== "SETTLED" ? (
                      <SettleCashAdvanceButton id={advance.id} />
                    ) : null}
                    <CashAdvanceFormDialog
                      currencyCode={user.currencyCode}
                      advance={{
                        id: advance.id,
                        personName: advance.personName,
                        amountIssued: serializeMoney(advance.amountIssued),
                        issueDate: toDateInputValue(advance.issueDate),
                        dueDate: advance.dueDate ? toDateInputValue(advance.dueDate) : "",
                      }}
                    />
                    <DeleteRecordButton id={advance.id} action={deleteCashAdvanceAction} />
                  </div>
                </div>
              ))}
            </HorizontalScroll>
            <div className="mt-2.5 flex justify-between rounded-lg bg-wn-bg px-3.5 py-2.5 font-bold text-wn-fg">
              <span>{t("openTotal")}</span>
              <span>
                {formatAmount(data.openCustody, locale)} {user.currencyCode}
              </span>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
