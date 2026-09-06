"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { parseStatementDate, type ParsedStatementRow } from "@/lib/finance/statement-parse";
import { initialRecordStatus } from "@/lib/finance/approval";
import { parseStatementPdf } from "@/lib/finance/statement-pdf";
import { bankImportSchema } from "@/lib/validation/records";
import { nextTransactionReference } from "@/services/transactions";
import { failState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";

export async function parseStatementPdfAction(formData: FormData): Promise<{
  rows: ParsedStatementRow[];
  error?: "validation" | "empty" | "generic";
}> {
  await requirePermission("transactions", "view");
  const file = formData.get("file");
  const bank = String(formData.get("bank") ?? "");
  const isPdf =
    file instanceof File &&
    file.size > 0 &&
    (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
  if (!isPdf) {
    return { rows: [], error: "validation" };
  }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const rows = await parseStatementPdf(bytes, bank);
    return rows.length > 0 ? { rows } : { rows: [], error: "empty" };
  } catch (error) {
    console.error("parseStatementPdfAction", error);
    return { rows: [], error: "generic" };
  }
}

export async function importBankStatementAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("transactions", "create");
  let rows: unknown = [];
  try {
    rows = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return failState();
  }

  const parsed = bankImportSchema.safeParse({
    bankAccountId: formData.get("bankAccountId"),
    rows,
  });
  if (!parsed.success) {
    return failState();
  }

  const account = await prisma.bankAccount.findFirst({
    where: { id: parsed.data.bankAccountId, ...companyScope(user.companyId) },
  });
  if (!account) {
    return failState();
  }

  try {
    let imported = 0;
    for (const row of parsed.data.rows) {
      const date = parseStatementDate(row.date);
      if (!date || (!row.debit && !row.credit)) {
        continue;
      }
      const type = row.credit > 0 && row.credit >= row.debit ? "DEPOSIT" : "WITHDRAWAL";
      const amount = type === "DEPOSIT" ? row.credit : row.debit;
      await prisma.bankTransaction.create({
        data: {
          companyId: user.companyId,
          bankAccountId: account.id,
          reference: await nextTransactionReference(user.companyId),
          date,
          type,
          amount: amount.toFixed(2),
          description: row.desc,
          category: type === "DEPOSIT" ? "other_income" : "other",
          notes: "Imported from bank statement",
          status: initialRecordStatus(user.role),
          createdById: user.id,
        },
      });
      imported += 1;
    }

    await writeAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "import",
      module: "transactions",
      recordId: account.id,
      newValue: { imported },
    });
    await revalidateApp(["/transactions", "/dashboard", "/bank-accounts", "/bank-reader", "/approvals"]);
    return { ok: true, at: Date.now(), imported };
  } catch (error) {
    console.error("importBankStatementAction", error);
    return failState();
  }
}
