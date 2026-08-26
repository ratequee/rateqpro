"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { settleCashAdvanceAction } from "./actions";

export function SettleCashAdvanceButton({ id }: { id: string }) {
  const t = useTranslations("assetsPage");
  return (
    <form action={settleCashAdvanceAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="success">
        {t("settle")}
      </Button>
    </form>
  );
}
