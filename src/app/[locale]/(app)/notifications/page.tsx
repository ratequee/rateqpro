import { Bell } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { formatDate } from "@/lib/formatting/date";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import {
  DeleteNotificationButton,
  MarkReadButton,
  RefreshAlertsButton,
} from "@/features/notifications/notification-actions";
import { refreshAlertsAction } from "@/features/notifications/actions";

export default async function NotificationsPage() {
  const user = await requirePermission("notifications", "view");
  const locale = await getLocale();
  const t = await getTranslations("notificationsPage");
  await refreshAlertsAction();
  const items = await prisma.notification.findMany({
    where: companyScope(user.companyId),
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={Bell} actions={<RefreshAlertsButton />} />
      {items.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="overflow-hidden rounded-[13px] border border-border bg-card">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-b border-muted px-3.5 py-2.5 last:border-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[13px] font-semibold">
                  {item.title}
                  {item.readAt ? null : <StatusPill>{t("unread")}</StatusPill>}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {item.body} · {formatDate(item.createdAt, user.dateFormat, locale)}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {item.readAt ? null : <MarkReadButton id={item.id} />}
                <DeleteNotificationButton id={item.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
