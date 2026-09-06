"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ScanSearch } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { parseInvoiceTextAction, scanInvoiceAction } from "./scan-invoice";
import { mergeInvoiceExtracts, type InvoiceExtract } from "@/lib/finance/invoice-parse";

async function ocrImage(file: File): Promise<string> {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng+ara");
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: "1",
    });
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

export function InvoiceScanner({
  onExtract,
  attachmentInputId,
}: {
  onExtract: (result: InvoiceExtract, file: File) => void;
  attachmentInputId?: string;
}) {
  const t = useTranslations("transactions.scan");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleFile(file: File | null) {
    if (!file) return;
    setStatus("working");
    setMessage(t("working"));
    try {
      const formData = new FormData();
      formData.set("invoice", file);
      let state = await scanInvoiceAction(formData);
      if (file.type.startsWith("image/")) {
        setMessage(t("ocr"));
        const text = await ocrImage(file);
        const fromText = await parseInvoiceTextAction(text);
        const merged = mergeInvoiceExtracts(state.result ?? null, fromText.result ?? null);
        state = merged ? { result: merged } : state;
      }
      if (!state.result) {
        setStatus("error");
        setMessage(t(state.error === "empty" ? "empty" : "failed"));
        return;
      }
      onExtract(state.result, file);
      if (attachmentInputId) {
        const input = document.getElementById(attachmentInputId) as HTMLInputElement | null;
        if (input) {
          const transfer = new DataTransfer();
          transfer.items.add(file);
          input.files = transfer.files;
        }
      }
      setStatus("done");
      setMessage(t("applied", { amount: state.result.amount }));
    } catch (error) {
      console.error("InvoiceScanner", error);
      setStatus("error");
      setMessage(t("failed"));
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-primary/30 bg-primary/4 p-3.5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ScanSearch className="size-4 text-primary" />
        {t("title")}
      </div>
      <p className="text-[12px] text-muted-foreground">{t("hint")}</p>
      <div className="space-y-1.5">
        <Label htmlFor="invoice-scan">{t("file")}</Label>
        <Input
          id="invoice-scan"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
        />
      </div>
      {status !== "idle" ? (
        <p
          className={
            status === "error"
              ? "text-sm text-destructive"
              : status === "done"
                ? "text-sm text-emerald-700"
                : "text-sm text-muted-foreground"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
