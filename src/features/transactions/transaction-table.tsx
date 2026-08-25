"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransactionStatusActions } from "./transaction-status-actions";
import { formatMoney } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { isTransactionCategory } from "@/lib/finance/categories";

type Row = {
  id: string;
  reference: string;
  date: Date;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: { toString(): string };
  description: string;
  category: string | null;
  status: "POSTED" | "VOIDED" | "REVERSED";
  project: { code: string; name: string } | null;
  createdBy: { name: string };
};

export function TransactionTable({
  rows,
  locale,
  currencyCode,
  dateFormat,
  canEdit,
  canVoid,
  canReverse,
}: {
  rows: Row[];
  locale: string;
  currencyCode: string;
  dateFormat: string;
  canEdit: boolean;
  canVoid: boolean;
  canReverse: boolean;
}) {
  const t = useTranslations("transactions");
  const tCat = useTranslations("transactions.categories");
  const tCommon = useTranslations("common");

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="min-w-[960px] w-full text-start text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-semibold">{t("reference")}</th>
              <th className="px-4 py-3 font-semibold">{t("date")}</th>
              <th className="px-4 py-3 font-semibold">{t("description")}</th>
              <th className="px-4 py-3 font-semibold">{t("project")}</th>
              <th className="px-4 py-3 font-semibold">{t("deposit")}</th>
              <th className="px-4 py-3 font-semibold">{t("withdrawal")}</th>
              <th className="px-4 py-3 font-semibold">{t("status")}</th>
              <th className="px-4 py-3 font-semibold">{tCommon("edit")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/transactions/${row.id}`} className="hover:underline">
                    {row.reference}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDate(row.date, dateFormat, locale)}
                </td>
                <td className="px-4 py-3">
                  <div>{row.description}</div>
                  {row.category && isTransactionCategory(row.category) ? (
                    <div className="text-xs text-muted-foreground">
                      {tCat(row.category)}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.project ? `${row.project.code}` : "—"}
                </td>
                <td className="px-4 py-3">
                  {row.type === "DEPOSIT"
                    ? formatMoney(row.amount.toString(), currencyCode, locale)
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {row.type === "WITHDRAWAL"
                    ? formatMoney(row.amount.toString(), currencyCode, locale)
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      row.status === "POSTED"
                        ? "success"
                        : row.status === "VOIDED"
                          ? "muted"
                          : "warning"
                    }
                  >
                    {t(`statuses.${row.status}`)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {canEdit && row.status === "POSTED" ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/transactions/${row.id}/edit`}>{tCommon("edit")}</Link>
                      </Button>
                    ) : null}
                    <TransactionStatusActions
                      id={row.id}
                      status={row.status}
                      canVoid={canVoid}
                      canReverse={canReverse}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );
}
