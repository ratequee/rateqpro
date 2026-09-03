"use client";

import { parseStatementRows, type BankCode, type ParsedStatementRow } from "@/lib/finance/statement-parse";

export async function parseStatementWorkbook(
  buffer: ArrayBuffer,
  bank: BankCode,
): Promise<ParsedStatementRow[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });
  return parseStatementRows(rows, bank);
}
