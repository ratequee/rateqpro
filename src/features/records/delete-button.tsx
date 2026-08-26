"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteRecordButton({
  id,
  action,
  label,
  fields,
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
  label?: string;
  fields?: Record<string, string>;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        {label ?? t("delete")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("delete")}
        description={t("deleteConfirm")}
        onConfirm={() => {
          startTransition(async () => {
            const formData = new FormData();
            formData.set("id", id);
            if (fields) {
              for (const [key, value] of Object.entries(fields)) {
                formData.set(key, value);
              }
            }
            await action(formData);
            setOpen(false);
            router.refresh();
          });
        }}
      />
    </>
  );
}
