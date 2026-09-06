import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/permissions/check";
import { formatMoney } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { isTransactionCategory } from "@/lib/finance/categories";
import { getTransaction, listTransactionAttachments } from "@/services/transactions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransactionStatusActions } from "@/features/transactions/transaction-status-actions";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("transactions", "view");
  const { id } = await params;
  const transaction = await getTransaction(user.companyId, id);
  if (!transaction) {
    notFound();
  }

  const locale = await getLocale();
  const t = await getTranslations("transactions");
  const tCat = await getTranslations("transactions.categories");
  const tCommon = await getTranslations("common");
  const attachments = await listTransactionAttachments(user.companyId, transaction.id);
  const canEdit =
    hasPermission(user.role, "transactions", "edit") && transaction.status === "POSTED";
  const canVoid = hasPermission(user.role, "transactions", "delete");
  const canReverse = hasPermission(user.role, "transactions", "approve");

  return (
    <div>
      <PageHeader
        title={transaction.reference}
        description={transaction.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canEdit ? (
              <Button asChild>
                <Link href={`/transactions/${transaction.id}/edit`}>{tCommon("edit")}</Link>
              </Button>
            ) : null}
            <TransactionStatusActions
              id={transaction.id}
              status={transaction.status}
              canVoid={canVoid}
              canReverse={canReverse}
            />
          </div>
        }
      />
      <div className="grid gap-4 rounded-xl border border-border bg-card p-6 shadow-card md:grid-cols-2">
        <Field label={t("date")} value={formatDate(transaction.date, user.dateFormat, locale)} />
        <Field
          label={t("type")}
          value={transaction.type === "DEPOSIT" ? t("deposit") : t("withdrawal")}
        />
        <Field
          label={t("amount")}
          value={formatMoney(transaction.amount.toString(), user.currencyCode, locale)}
        />
        <div>
          <p className="text-sm text-muted-foreground">{t("status")}</p>
          <Badge variant={transaction.status === "POSTED" ? "success" : "muted"}>
            {t(`statuses.${transaction.status}`)}
          </Badge>
        </div>
        <Field
          label={t("category")}
          value={
            transaction.category && isTransactionCategory(transaction.category)
              ? tCat(transaction.category)
              : "—"
          }
        />
        <Field
          label={t("project")}
          value={
            transaction.project
              ? `${transaction.project.code} — ${transaction.project.name}`
              : t("noProject")
          }
        />
        <Field
          label={t("source")}
          value={
            transaction.paymentSource === "CASH"
              ? t("cash")
              : transaction.creditCard
                ? transaction.creditCard.last4
                  ? `${transaction.creditCard.name} ••${transaction.creditCard.last4}`
                  : transaction.creditCard.name
                : transaction.cashAdvance
                  ? transaction.cashAdvance.personName
                  : (transaction.bankAccount?.name ?? "—")
          }
        />
        <Field label={t("createdBy")} value={transaction.createdBy.name} />
        <Field
          label={t("createdAt")}
          value={formatDate(transaction.createdAt, user.dateFormat, locale)}
        />
        <Field
          label={t("updatedAt")}
          value={formatDate(transaction.updatedAt, user.dateFormat, locale)}
        />
        <div className="md:col-span-2">
          <Field label={t("notes")} value={transaction.notes || "—"} />
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          {t("attachment")}
        </h2>
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noAttachments")}</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((file) => (
              <li key={file.id}>
                <a
                  className="text-sm font-medium text-primary hover:underline"
                  href={`/api/attachments/${file.id}`}
                >
                  {file.fileName}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
