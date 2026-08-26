"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { fromDateInputValue } from "@/lib/formatting/date";
import { obligationFormSchema } from "@/lib/validation/records";
import {
  advanceObligationDueDate,
  obligationToExpenseCategory,
} from "@/lib/finance/obligation-dates";
import { getPrimaryBankAccount, nextTransactionReference } from "@/services/transactions";
import { failState, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";

async function touch() {
  await revalidateApp(["/obligations", "/approvals", "/dashboard", "/cash-flow", "/transactions"]);
}

export async function saveObligationAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("obligations", "create");
  const parsed = obligationFormSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    frequency: formData.get("frequency"),
    dueDate: formData.get("dueDate"),
    reminderDays: formData.get("reminderDays") ?? "7",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return failState();
  }

  const dueDate = fromDateInputValue(parsed.data.dueDate);
  const data = {
    name: parsed.data.name,
    category: parsed.data.category,
    amount: parsed.data.amount,
    frequency: parsed.data.frequency,
    dueDate,
    nextDueDate: dueDate,
    reminderDays: Number(parsed.data.reminderDays || "7"),
    notes: parsed.data.notes || null,
    status: "ACTIVE" as const,
  };

  try {
    if (parsed.data.id) {
      const existing = await prisma.obligation.findFirst({
        where: { id: parsed.data.id, ...companyScope(user.companyId) },
      });
      if (!existing) {
        return failState();
      }
      await prisma.obligation.update({ where: { id: existing.id }, data });
    } else {
      const created = await prisma.obligation.create({
        data: { companyId: user.companyId, ...data },
      });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "create",
        module: "obligations",
        recordId: created.id,
        newValue: { name: created.name, amount: parsed.data.amount },
      });
    }
  } catch (error) {
    console.error("saveObligationAction", error);
    return failState();
  }

  await touch();
  return okState();
}

export async function payObligationAction(formData: FormData): Promise<void> {
  const user = await requirePermission("obligations", "edit");
  const id = String(formData.get("id") ?? "");
  const obligation = await prisma.obligation.findFirst({
    where: { id, ...companyScope(user.companyId), status: "ACTIVE" },
  });
  if (!obligation) {
    return;
  }

  const account = await getPrimaryBankAccount(user.companyId);
  if (!account) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.bankTransaction.create({
      data: {
        companyId: user.companyId,
        bankAccountId: account.id,
        reference: await nextTransactionReference(user.companyId, tx),
        date: new Date(),
        type: "WITHDRAWAL",
        amount: obligation.amount,
        description: obligation.name,
        category: obligationToExpenseCategory(obligation.category),
        status: "POSTED",
        createdById: user.id,
      },
    });

    if (obligation.frequency === "ONE_TIME") {
      await tx.obligation.update({
        where: { id: obligation.id },
        data: { status: "COMPLETED", nextDueDate: obligation.nextDueDate },
      });
    } else {
      const nextDue = advanceObligationDueDate(obligation.nextDueDate, obligation.frequency);
      await tx.obligation.update({
        where: { id: obligation.id },
        data: { nextDueDate: nextDue },
      });
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    userId: user.id,
    action: "pay",
    module: "obligations",
    recordId: obligation.id,
    newValue: { name: obligation.name, amount: obligation.amount.toString() },
  });

  await touch();
}

export async function pauseObligationAction(formData: FormData): Promise<void> {
  const user = await requirePermission("obligations", "edit");
  const id = String(formData.get("id") ?? "");
  await prisma.obligation.updateMany({
    where: { id, ...companyScope(user.companyId) },
    data: { status: "PAUSED" },
  });
  await touch();
}

export async function deleteObligationAction(formData: FormData): Promise<void> {
  const user = await requirePermission("obligations", "delete");
  const id = String(formData.get("id") ?? "");
  await prisma.obligation.deleteMany({
    where: { id, ...companyScope(user.companyId) },
  });
  await writeAuditLog({
    companyId: user.companyId,
    userId: user.id,
    action: "delete",
    module: "obligations",
    recordId: id,
  });
  await touch();
}
