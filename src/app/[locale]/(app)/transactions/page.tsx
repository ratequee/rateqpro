import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/permissions/check";
import { formatMoney } from "@/lib/formatting/currency";
import { listCompanyProjects, listTransactions } from "@/services/transactions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { TransactionFilters } from "@/features/transactions/transaction-filters";
import { TransactionTable } from "@/features/transactions/transaction-table";

type Search = {
  q?: string;
  type?: string;
  status?: string;
  projectId?: string;
  from?: string;
  to?: string;
  page?: string;
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requirePermission("transactions", "view");
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("transactions");
  const tEmpty = await getTranslations("empty.transactions");

  const type =
    params.type === "DEPOSIT" || params.type === "WITHDRAWAL" ? params.type : "ALL";
  const status =
    params.status === "POSTED" ||
    params.status === "VOIDED" ||
    params.status === "REVERSED"
      ? params.status
      : "ALL";

  const [result, projects] = await Promise.all([
    listTransactions({
      companyId: user.companyId,
      search: params.q,
      type,
      status,
      projectId: params.projectId,
      from: params.from,
      to: params.to,
      page: Number(params.page ?? "1") || 1,
    }),
    listCompanyProjects(user.companyId),
  ]);

  const canCreate = hasPermission(user.role, "transactions", "create");
  const money = (value: bigint) => formatMoney(value, user.currencyCode, locale);

  function hrefForPage(page: number) {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (params.type) next.set("type", params.type);
    if (params.status) next.set("status", params.status);
    if (params.projectId) next.set("projectId", params.projectId);
    if (params.from) next.set("from", params.from);
    if (params.to) next.set("to", params.to);
    if (page > 1) next.set("page", String(page));
    const query = next.toString();
    return query ? `/transactions?${query}` : "/transactions";
  }

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/transactions/new">{t("add")}</Link>
            </Button>
          ) : null
        }
      />

      <TransactionFilters
        search={params.q ?? ""}
        type={type}
        status={status}
        projectId={params.projectId ?? ""}
        from={params.from ?? ""}
        to={params.to ?? ""}
        projects={projects}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label={t("totalDeposits")} value={money(result.totals.deposits)} />
        <StatCard label={t("totalWithdrawals")} value={money(result.totals.withdrawals)} />
        <StatCard label={t("netMovement")} value={money(result.totals.net)} />
      </div>

      {result.rows.length === 0 ? (
        <EmptyState
          title={tEmpty("title")}
          description={tEmpty("description")}
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/transactions/new">{t("add")}</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <TransactionTable
            rows={result.rows}
            locale={locale}
            currencyCode={user.currencyCode}
            dateFormat={user.dateFormat}
            canEdit={hasPermission(user.role, "transactions", "edit")}
            canVoid={hasPermission(user.role, "transactions", "delete")}
            canReverse={hasPermission(user.role, "transactions", "approve")}
          />
          <PaginationLinks
            page={result.page}
            pageCount={result.pageCount}
            previousLabel={t("previous")}
            nextLabel={t("next")}
            hrefForPage={hrefForPage}
          />
        </>
      )}
    </div>
  );
}
