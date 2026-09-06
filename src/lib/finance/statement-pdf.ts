import { extractText, getDocumentProxy } from "unpdf";
import { isBankCode, parseStatementPdfText, type ParsedStatementRow } from "./statement-parse";

export async function parseStatementPdf(
  bytes: Uint8Array,
  bank: string,
): Promise<ParsedStatementRow[]> {
  if (!isBankCode(bank)) return [];
  const pdf = await getDocumentProxy(bytes);
  const extracted = await extractText(pdf, { mergePages: false });
  const text = Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text;
  return parseStatementPdfText(text, bank);
}
