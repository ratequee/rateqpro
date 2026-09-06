"use server";

import { requirePermission } from "@/lib/auth/guards";
import { extractInvoiceWithGemini } from "@/lib/finance/invoice-ai";
import { parseInvoiceText, type InvoiceExtract } from "@/lib/finance/invoice-parse";

export type ScanInvoiceState = {
  error?: "validation" | "empty" | "generic";
  result?: InvoiceExtract;
};

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

async function textFromPdf(bytes: Buffer) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const extracted = await extractText(pdf, { mergePages: true });
  return Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text;
}

export async function scanInvoiceAction(formData: FormData): Promise<ScanInvoiceState> {
  await requirePermission("transactions", "create");
  const file = formData.get("invoice");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "validation" };
  }
  if (file.size > MAX_BYTES || !ALLOWED.has(file.type)) {
    return { error: "validation" };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const fromAi = await extractInvoiceWithGemini({ bytes, mimeType: file.type });
    if (fromAi) {
      return { result: fromAi };
    }
    if (file.type === "application/pdf") {
      const text = await textFromPdf(bytes);
      const parsed = parseInvoiceText(text);
      return parsed ? { result: parsed } : { error: "empty" };
    }
    return { error: "empty" };
  } catch (error) {
    console.error("scanInvoiceAction", error);
    return { error: "generic" };
  }
}

export async function parseInvoiceTextAction(text: string): Promise<ScanInvoiceState> {
  await requirePermission("transactions", "create");
  const parsed = parseInvoiceText(text);
  return parsed ? { result: parsed } : { error: "empty" };
}
