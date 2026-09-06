"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { fromDateInputValue } from "@/lib/formatting/date";
import { expenseFormSchema } from "@/lib/validation/records";
import { failState, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";
import type { PermissionModule } from "@/lib/permissions/catalog";
import { initialRecordStatus } from "@/lib/finance/approval";
import { createSourceMovement, markSourceMovementStatus, updateSourceMovement } from "@/lib/finance/source-posting";

function moduleForKind(kind: "PROJECT" | "OPERATING"): PermissionModule {
  return kind === "PROJECT" ? "expenses" : "operatingExpenses";
}

async function touch() {
  await revalidateApp([
    "/operating-expenses",
    "/project-expenses",
    "/reports",
    "/dashboard",
    "/transactions",
    "/bank-accounts",
    "/assets",
  ]);
}

export async function saveExpenseAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const kind = formData.get("kind") === "PROJECT" ? "PROJECT" : "OPERATING";
  const user = await requirePermission(moduleForKind(kind), "create");
  const parsed = expenseFormSchema.safeParse({
    id: formData.get("id") ?? "",
    kind,
    projectId: formData.get("projectId") ?? "",
    date: formData.get("date"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    description: formData.get("description"),
    notes: formData.get("notes") ?? "",
    paymentSource: formData.get("paymentSource") ?? "CASH",
  });
  if (!parsed.success) {
    return failState();
  }

  const status = initialRecordStatus(user.role);
  const movementInput = {
    companyId: user.companyId,
    userId: user.id,
    sourceRaw: parsed.data.paymentSource,
    date: fromDateInputValue(parsed.data.date),
    type: "WITHDRAWAL" as const,
    amount: parsed.data.amount,
    description: parsed.data.description,
    category: parsed.data.category,
    projectId: parsed.data.kind === "PROJECT" ? parsed.data.projectId : null,
    notes: parsed.data.notes || null,
    expenseKind: parsed.data.kind,
    status,
  };

  try {
    if (parsed.data.id) {
      const existing = await prisma.expense.findFirst({
        where: { id: parsed.data.id, ...companyScope(user.companyId) },
      });
      if (!existing) return failState();
      let transactionId = existing.transactionId;
      if (transactionId) {
        const moved = await updateSourceMovement({ id: transactionId, ...movementInput, status: existing.status });
        if ("error" in moved) return failState();
      } else {
        const posted = await createSourceMovement({ ...movementInput, status: existing.status });
        if ("error" in posted) return failState();
        transactionId = posted.row.id;
      }
      const linked = await prisma.bankTransaction.findFirst({
        where: { id: transactionId, ...companyScope(user.companyId) },
      });
      await prisma.expense.update({
        where: { id: existing.id },
        data: {
          kind: parsed.data.kind,
          projectId: parsed.data.kind === "PROJECT" ? parsed.data.projectId : null,
          date: movementInput.date,
          amount: parsed.data.amount,
          category: parsed.data.category,
          description: parsed.data.description,
          notes: parsed.data.notes || null,
          paymentSource: linked?.paymentSource ?? existing.paymentSource,
          bankAccountId: linked?.bankAccountId ?? null,
          creditCardId: linked?.creditCardId ?? null,
          cashAdvanceId: linked?.cashAdvanceId ?? null,
          transactionId,
        },
      });
    } else {
      const posted = await createSourceMovement(movementInput);
      if ("error" in posted) return failState();
      const created = await prisma.expense.create({
        data: {
          companyId: user.companyId,
          createdById: user.id,
          status,
          kind: parsed.data.kind,
          projectId: parsed.data.kind === "PROJECT" ? parsed.data.projectId : null,
          transactionId: posted.row.id,
          date: movementInput.date,
          amount: parsed.data.amount,
          category: parsed.data.category,
          description: parsed.data.description,
          notes: parsed.data.notes || null,
          paymentSource: posted.row.paymentSource,
          bankAccountId: posted.row.bankAccountId,
          creditCardId: posted.row.creditCardId,
          cashAdvanceId: posted.row.cashAdvanceId,
        },
      });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "create",
        module: kind === "PROJECT" ? "project-expenses" : "operating-expenses",
        recordId: created.id,
        newValue: { amount: parsed.data.amount, source: parsed.data.paymentSource },
      });
    }
  } catch (error) {
    console.error("saveExpenseAction", error);
    return failState();
  }

  await touch();
  return okState();
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  const kind = formData.get("kind") === "PROJECT" ? "PROJECT" : "OPERATING";
  const user = await requirePermission(moduleForKind(kind), "delete");
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.expense.findFirst({
    where: { id, ...companyScope(user.companyId) },
  });
  if (existing?.transactionId) {
    await markSourceMovementStatus(user.companyId, existing.transactionId, "VOIDED");
  }
  await prisma.expense.deleteMany({
    where: { id, ...companyScope(user.companyId) },
  });
  await touch();
}
