"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { reverseTransactionAction, voidTransactionAction } from "./actions";

export function TransactionStatusActions({
  id,
  status,
  canVoid,
  canReverse,
}: {
  id: string;
  status: "PENDING" | "POSTED" | "VOIDED" | "REVERSED";
  canVoid: boolean;
  canReverse: boolean;
}) {
  const t = useTranslations("transactions");
  const router = useRouter();
  const [mode, setMode] = useState<"void" | "reverse" | null>(null);
  const [isPending, startTransition] = useTransition();

  if (status !== "POSTED" || (!canVoid && !canReverse)) {
    return null;
  }

  function confirm() {
    if (!mode) {
      return;
    }
    const action = mode === "void" ? voidTransactionAction : reverseTransactionAction;
    startTransition(async () => {
      await action(id);
      setMode(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {canVoid ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => setMode("void")}
          >
            {t("void")}
          </Button>
        ) : null}
        {canReverse ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => setMode("reverse")}
          >
            {t("reverse")}
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        open={Boolean(mode)}
        onOpenChange={(open) => {
          if (!open) {
            setMode(null);
          }
        }}
        title={mode === "reverse" ? t("reverseTitle") : t("voidTitle")}
        description={mode === "reverse" ? t("reverseBody") : t("voidBody")}
        onConfirm={confirm}
      />
    </>
  );
}
