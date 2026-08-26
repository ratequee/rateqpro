import { getLocale, getTranslations } from "next-intl/server";
import { Landmark } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getBankWorkspace } from "@/lib/finance/workspace";
import { formatAmount } from "@/lib/formatting/currency";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const accountGradients = [
  "bg-linear-to-br from-primary-deep to-primary",
  "bg-linear-to-br from-[#1e3a5f] to-[#2d6a9f]",
  "bg-linear-to-br from-[#1a1a2e] to-[#16213e]",
];

export default async function BankAccountsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("bank");
  const { accounts, cards, snapshot } = await getBankWorkspace(user.companyId);

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={Landmark} />
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <KpiCard
          accent="brand"
          label={t("totalBalance")}
          value={formatAmount(snapshot.bankBalance, locale)}
          hint={user.currencyCode}
        />
        <KpiCard accent="success" label={t("accounts")} value={String(accounts.length)} />
        <KpiCard accent="warning" label={t("cards")} value={String(cards.length)} />
        <KpiCard accent="none" label={t("creditCard")} value={String(cards.length)} />
      </section>
      {accounts.length === 0 && cards.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account, index) => (
            <div
              key={account.id}
              className={cn(
                "relative overflow-hidden rounded-[13px] px-[19px] py-4 text-white",
                accountGradients[index % accountGradients.length],
              )}
            >
              <div className="pointer-events-none absolute -top-6 -start-6 size-[100px] rounded-full bg-white/6" />
              <p className="mb-2 flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/60">
                <Landmark className="size-3.5" />
                {account.isPrimary ? t("mainBank") : t("bank")}
              </p>
              <p className="text-[14.5px] font-bold">
                {account.bankName ?? account.name}
                {account.bankName ? ` — ${account.name}` : ""}
              </p>
              <p className="mt-0.5 font-mono text-[11px] tracking-wider text-white/50">
                {account.accountNo ?? "••••"}
              </p>
              <p className="mt-3 text-[9.5px] text-white/50">
                {account.isPrimary ? t("currentBalance") : t("balance")}
              </p>
              <p className="text-[26px] font-bold text-gold-bright">
                {account.isPrimary
                  ? `${formatAmount(snapshot.bankBalance, locale)} ${user.currencyCode}`
                  : `0 ${user.currencyCode}`}
              </p>
            </div>
          ))}
          {cards.map((card) => (
            <div
              key={card.id}
              className="relative overflow-hidden rounded-[13px] bg-linear-to-br from-[#1a1a2e] to-[#16213e] px-[19px] py-4 text-white"
            >
              <p className="mb-2 text-[10px] uppercase tracking-wider text-white/60">
                {t("creditCard")}
              </p>
              <p className="text-[14.5px] font-bold">{card.name}</p>
              <p className="mt-0.5 font-mono text-[11px] tracking-wider text-white/50">
                {card.last4 ? `•••• •••• ${card.last4}` : "••••"}
              </p>
              <p className="mt-3 text-[9.5px] text-white/50">{t("balance")}</p>
              <p className="text-[26px] font-bold text-gold-bright">—</p>
            </div>
          ))}
        </div>
      )}
      {cards.length > 0 ? (
        <SectionCard title={t("cards")}>
          <p className="text-sm text-muted-foreground">{cards.map((card) => card.name).join(" · ")}</p>
        </SectionCard>
      ) : null}
    </div>
  );
}
