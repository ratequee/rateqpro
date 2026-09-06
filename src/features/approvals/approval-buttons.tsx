"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function ApprovalButtons({
  id,
  approve,
  reject,
}: {
  id: string;
  approve: (formData: FormData) => Promise<void>;
  reject: (formData: FormData) => Promise<void>;
}) {
  const t = useTranslations("approvals");
  return (
    <div className="flex gap-1.5">
      <form action={approve}>
        <input type="hidden" name="id" value={id} />
        <Button size="sm" type="submit">
          {t("approve")}
        </Button>
      </form>
      <form action={reject}>
        <input type="hidden" name="id" value={id} />
        <Button size="sm" type="submit" variant="outline">
          {t("reject")}
        </Button>
      </form>
    </div>
  );
}
