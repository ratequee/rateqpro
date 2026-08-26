import { Files } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { formatDate, toDateInputValue } from "@/lib/formatting/date";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { DocumentFormDialog } from "@/features/documents/document-form";
import { DeleteRecordButton } from "@/features/records/delete-button";
import { deleteDocumentAction } from "@/features/documents/actions";

const DOCUMENT_CATEGORIES = ["LICENSE", "CR", "ID", "CONTRACT", "INSURANCE", "OTHER"] as const;

function isDocumentCategory(
  value: string,
): value is (typeof DOCUMENT_CATEGORIES)[number] {
  return (DOCUMENT_CATEGORIES as readonly string[]).includes(value);
}

const DAY = 24 * 60 * 60 * 1000;

function documentStatus(endDate: Date | null, now: Date) {
  if (!endDate) {
    return "valid" as const;
  }
  const diff = endDate.getTime() - now.getTime();
  if (diff < 0) {
    return "expired" as const;
  }
  if (diff <= 60 * DAY) {
    return "expiring" as const;
  }
  return "valid" as const;
}

export default async function DocumentsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("documentsPage");
  const now = new Date();

  const documents = await prisma.companyDocument.findMany({
    where: companyScope(user.companyId),
    orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
  });

  const rows = documents.map((item) => ({
    ...item,
    status: documentStatus(item.expiryDate, now),
  }));

  const expired = rows.filter((item) => item.status === "expired").length;
  const expiring = rows.filter((item) => item.status === "expiring").length;
  const valid = rows.filter((item) => item.status === "valid").length;

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={Files} actions={<DocumentFormDialog />} />
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <KpiCard accent="danger" label={t("expired")} value={String(expired)} valueClassName="text-destructive" />
        <KpiCard accent="warning" label={t("expiring")} value={String(expiring)} valueClassName="text-warning" />
        <KpiCard accent="success" label={t("valid")} value={String(valid)} valueClassName="text-success" />
        <KpiCard accent="none" label={t("total")} value={String(rows.length)} />
      </section>
      {rows.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="overflow-hidden rounded-[13px] border border-border bg-card">
          {rows.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-b border-muted px-3.5 py-2.5 last:border-0"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold">{item.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {isDocumentCategory(item.category)
                    ? t(`categories.${item.category}`)
                    : item.category}
                  {item.expiryDate
                    ? ` · ${formatDate(item.expiryDate, user.dateFormat, locale)}`
                    : ""}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusPill
                  variant={
                    item.status === "expired"
                      ? "danger"
                      : item.status === "expiring"
                        ? "pending"
                        : "success"
                  }
                >
                  {t(
                    item.status === "expired"
                      ? "statusExpired"
                      : item.status === "expiring"
                        ? "statusExpiring"
                        : "statusValid",
                  )}
                </StatusPill>
                <DocumentFormDialog
                  document={{
                    id: item.id,
                    name: item.name,
                    category: item.category,
                    expiryDate: item.expiryDate ? toDateInputValue(item.expiryDate) : "",
                    notes: item.notes,
                  }}
                />
                <DeleteRecordButton id={item.id} action={deleteDocumentAction} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
