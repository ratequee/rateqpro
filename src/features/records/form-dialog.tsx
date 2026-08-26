"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { RecordActionState } from "./state";

export function RecordFormDialog({
  title,
  trigger,
  action,
  children,
}: {
  title: string;
  trigger: ReactNode;
  action: (
    prev: RecordActionState,
    formData: FormData,
  ) => Promise<RecordActionState>;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
    }
  }, [state.ok, state.at]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {children}
          {state.error ? (
            <p className="text-sm text-destructive">{t("genericError")}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("loading") : t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
