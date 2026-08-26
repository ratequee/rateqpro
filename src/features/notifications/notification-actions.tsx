"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  deleteNotificationAction,
  markNotificationReadAction,
  refreshAlertsAction,
} from "./actions";

export function RefreshAlertsButton() {
  const t = useTranslations("notificationsPage");
  return (
    <form action={refreshAlertsAction}>
      <Button type="submit" variant="outline">
        {t("refresh")}
      </Button>
    </form>
  );
}

export function MarkReadButton({ id }: { id: string }) {
  const t = useTranslations("notificationsPage");
  return (
    <form action={markNotificationReadAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="outline">
        {t("markRead")}
      </Button>
    </form>
  );
}

export function DeleteNotificationButton({ id }: { id: string }) {
  const t = useTranslations("common");
  return (
    <form action={deleteNotificationAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="ghost">
        {t("delete")}
      </Button>
    </form>
  );
}
