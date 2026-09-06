import { getLocale, getTranslations } from "next-intl/server";
import { Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/permissions/check";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { formatAmount } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { HorizontalScroll } from "@/components/ui/horizontal-scroll";
import { Button } from "@/components/ui/button";
import { ExpenseFormDialog } from "@/features/expenses/expense-form";
import { inferredExpenseKind, isTransactionCategory } from "@/lib/finance/categories";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type ExpenseTab = "ALL" | "OPERATING" | "PROJECT";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const user = await requireUser();
  const locale = await getLocale();
  const params = await searchParams;
  const t = await getTranslations("expensesPage");
  const tCat = await getTranslations("transactions.categories");
  const tCommon = await getTranslations("common");
  const canOperating = hasPermission(user.role, "operatingExpenses", "view", user.permissionKeys);
  const canProject = hasPermission(user.role, "expenses", "view", user.permissionKeys);
  const canTransactions = hasPermission(user.role, "transactions", "view", user.permissionKeys);
  if (!canOperating && !canProject && !canTransactions) {
    redirect({ href: "/dashboard", locale });
  }

  const tab: ExpenseTab =
    params.kind === "project" && canProject
      ? "PROJECT"
      : params.kind === "operating" && canOperating
        ? "OPERATING"
        : "ALL";

  const [rows, projects, accounts, cards, advances] = await Promise.all([
    prisma.bankTransaction.findMany({
      where: {
        ...companyScope(user.companyId),
        type: "WITHDRAWAL",
        isTransfer: false,
        status: { in: ["POSTED", "PENDING"] },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { project: { select: { code: true, name: true } } },
    }),
    prisma.project.findMany({
      where: companyScope(user.companyId),
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.bankAccount.findMany({
      where: { ...companyScope(user.companyId), isActive: true },
      select: { id: true, name: true, isPrimary: true },
    }),
    prisma.creditCard.findMany({
      where: { ...companyScope(user.companyId), isActive: true },
      select: { id: true, name: true, last4: true },
    }),
    prisma.cashAdvance.findMany({
      where: { ...companyScope(user.companyId), status: { in: ["OPEN", "PARTIALLY_SETTLED"] } },
      select: { id: true, personName: true },
    }),
  ]);

  const visible = rows.filter((row) => {
    if (tab === "ALL") return true;
    return inferredExpenseKind(row) === tab;
  });
  const total = visible.reduce((sum, row) => sum + Number(row.amount.toString()), 0);
  const showProject = tab !== "OPERATING";
  const grid = showProject
    ? "grid-cols-[1fr_140px_120px_120px_110px_minmax(90px,auto)]"
    : "grid-cols-[1fr_120px_120px_110px_minmax(90px,auto)]";
  const canEdit = hasPermission(user.role, "transactions", "edit", user.permissionKeys);

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        title={t("title")}
        icon={Receipt}
        actions={
          <ExpenseFormDialog
            kind={tab === "PROJECT" ? "PROJECT" : "OPERATING"}
            allowKindSwitch={canOperating && canProject}
            canOperating={canOperating}
            canProject={canProject}
            currencyCode={user.currencyCode}
            projects={projects}
            accounts={accounts}
            cards={cards}
            advances={advances}
          />
        }
      />
      <div className="flex flex-wrap gap-2">
        <Link
          href="/expenses"
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs",
            tab === "ALL"
              ? "border-primary bg-brand-soft font-bold text-primary"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          {t("all")}
        </Link>
        {canOperating ? (
          <Link
            href="/expenses?kind=operating"
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              tab === "OPERATING"
                ? "border-primary bg-brand-soft font-bold text-primary"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {t("operating")}
          </Link>
        ) : null}
        {canProject ? (
          <Link
            href="/expenses?kind=project"
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              tab === "PROJECT"
                ? "border-primary bg-brand-soft font-bold text-primary"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {t("projectKind")}
          </Link>
        ) : null}
      </div>
      {visible.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <HorizontalScroll className="rounded-[13px] border border-border bg-card" minWidth={showProject ? "900px" : "780px"}>
          <div className={cn("grid bg-muted px-3.5 py-2.5 text-[11px] font-semibold text-muted-foreground", grid)}>
            <span>{t("description")}</span>
            {showProject ? <span>{t("project")}</span> : null}
            <span>{t("category")}</span>
            <span>{t("amount")}</span>
            <span>{t("date")}</span>
            <span />
          </div>
          {visible.map((row) => (
            <div key={row.id} className={cn("grid items-center border-t border-muted px-3.5 py-2.5 text-[12.5px]", grid)}>
              <span className="font-semibold">{row.description}</span>
              {showProject ? (
                <span className="text-muted-foreground">{row.project?.code ?? "—"}</span>
              ) : null}
              <span className="text-muted-foreground">
                {row.category && isTransactionCategory(row.category) ? tCat(row.category) : (row.category ?? "—")}
              </span>
              <span className="font-bold text-primary">
                {formatAmount(row.amount.toString(), locale)} {user.currencyCode}
              </span>
              <span>{formatDate(row.date, user.dateFormat, locale)}</span>
              <div className="flex gap-1">
                {canEdit ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/transactions/${row.id}/edit`}>{tCommon("edit")}</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          <div className="flex justify-between border-t border-border bg-muted px-3.5 py-2.5 text-sm font-bold">
            <span>{t("total")}</span>
            <span>
              {formatAmount(total, locale)} {user.currencyCode}
            </span>
          </div>
        </HorizontalScroll>
      )}
    </div>
  );
}
