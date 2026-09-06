"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { transactionFormSchema } from "@/lib/validation/transaction";
import { categoriesForType } from "@/lib/finance/categories";
import { fromDateInputValue } from "@/lib/formatting/date";
import { encodePaymentSource } from "@/lib/finance/payment-source";
import { initialRecordStatus } from "@/lib/finance/approval";
import {
  createSourceMovement,
  markSourceMovementStatus,
  updateSourceMovement,
} from "@/lib/finance/source-posting";
import {
  attachmentStorageKey,
  isAllowedAttachment,
  uploadPrivateAttachment,
} from "@/lib/supabase/storage";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { redirect } from "@/i18n/navigation";

export type TransactionActionState = {
  error?: "validation" | "forbidden" | "notFound" | "storage" | "generic" | "immutable" | "source";
  fieldError?: string;
};

function revalidateFinance(locale: string) {
  revalidatePath(`/${locale}/transactions`);
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/bank-accounts`);
  revalidatePath(`/${locale}/assets`);
  revalidatePath(`/${locale}/expenses`);
  revalidatePath(`/${locale}/operating-expenses`);
  revalidatePath(`/${locale}/project-expenses`);
  revalidatePath(`/${locale}/reports`);
  revalidatePath(`/${locale}/approvals`);
}

async function saveAttachment(input: {
  companyId: string;
  transactionId: string;
  file: File;
}) {
  if (input.file.size === 0) {
    return;
  }
  if (!isSupabaseConfigured()) {
    throw new Error("STORAGE_NOT_CONFIGURED");
  }
  if (!isAllowedAttachment(input.file.type, input.file.size)) {
    throw new Error("INVALID_FILE");
  }
  const bytes = Buffer.from(await input.file.arrayBuffer());
  const storageKey = attachmentStorageKey({
    companyId: input.companyId,
    ownerType: "transactions",
    ownerId: input.transactionId,
    fileName: input.file.name,
  });
  await uploadPrivateAttachment({
    storageKey,
    bytes,
    mimeType: input.file.type,
  });
  await prisma.attachment.create({
    data: {
      companyId: input.companyId,
      ownerType: "TRANSACTION",
      ownerId: input.transactionId,
      fileName: input.file.name,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      storageKey,
    },
  });
}

export async function createTransactionAction(
  _prev: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const user = await requirePermission("transactions", "create");
  const parsed = transactionFormSchema.safeParse({
    date: formData.get("date"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    category: formData.get("category"),
    projectId: formData.get("projectId") ?? "",
    notes: formData.get("notes") ?? "",
    bankAccountId: formData.get("bankAccountId") ?? "",
    paymentSource: formData.get("paymentSource") ?? formData.get("bankAccountId") ?? "",
    expenseKind: formData.get("expenseKind") ?? "",
  });

  if (!parsed.success) {
    return { error: "validation" };
  }

  const allowed = categoriesForType(
    parsed.data.type,
    parsed.data.type === "WITHDRAWAL" && parsed.data.expenseKind
      ? parsed.data.expenseKind
      : null,
  );
  if (!allowed.includes(parsed.data.category)) {
    return { error: "validation", fieldError: "category" };
  }

  if (parsed.data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: parsed.data.projectId, ...companyScope(user.companyId) },
    });
    if (!project) {
      return { error: "validation", fieldError: "projectId" };
    }
  }

  const pendingFile = formData.get("attachment");
  if (pendingFile instanceof File && pendingFile.size > 0 && !isSupabaseConfigured()) {
    return { error: "storage" };
  }

  const locale = await getLocale();
  const status = initialRecordStatus(user.role);
  const sourceRaw =
    parsed.data.paymentSource ||
    (parsed.data.bankAccountId ? `BANK_ACCOUNT:${parsed.data.bankAccountId}` : "CASH");

  try {
    const posted = await createSourceMovement({
      companyId: user.companyId,
      userId: user.id,
      sourceRaw,
      date: fromDateInputValue(parsed.data.date),
      type: parsed.data.type,
      amount: parsed.data.amount,
      description: parsed.data.description,
      category: parsed.data.category,
      projectId:
        parsed.data.type === "WITHDRAWAL" && parsed.data.expenseKind === "PROJECT"
          ? parsed.data.projectId || null
          : null,
      notes: parsed.data.notes || null,
      expenseKind:
        parsed.data.type === "WITHDRAWAL" && parsed.data.expenseKind
          ? parsed.data.expenseKind
          : null,
      status,
    });
    if ("error" in posted) {
      return { error: "source" };
    }
    const created = posted.row;

    try {
      const file = formData.get("attachment");
      if (file instanceof File && file.size > 0) {
        await saveAttachment({
          companyId: user.companyId,
          transactionId: created.id,
          file,
        });
      }
    } catch (error) {
      await prisma.bankTransaction.delete({ where: { id: created.id } });
      throw error;
    }

    await writeAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "create",
      module: "transactions",
      recordId: created.id,
      newValue: {
        reference: created.reference,
        type: created.type,
        amount: created.amount.toString(),
        description: created.description,
      },
    });
  } catch (error) {
    console.error("createTransactionAction", error);
    if (error instanceof Error && error.message === "STORAGE_NOT_CONFIGURED") {
      return { error: "storage" };
    }
    if (error instanceof Error && error.message === "INVALID_FILE") {
      return { error: "validation" };
    }
    return { error: "generic" };
  }

  revalidateFinance(locale);
  redirect({ href: "/transactions", locale });
  return {};
}

export async function updateTransactionAction(
  _prev: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const user = await requirePermission("transactions", "edit");
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.bankTransaction.findFirst({
    where: { id, ...companyScope(user.companyId) },
  });
  if (!existing) {
    return { error: "notFound" };
  }
  if (existing.status !== "POSTED" && existing.status !== "PENDING") {
    return { error: "immutable" };
  }

  const parsed = transactionFormSchema.safeParse({
    date: formData.get("date"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    category: formData.get("category"),
    projectId: formData.get("projectId") ?? "",
    notes: formData.get("notes") ?? "",
    bankAccountId: formData.get("bankAccountId") || existing.bankAccountId || "",
    paymentSource:
      formData.get("paymentSource") ||
      encodePaymentSource(
        existing.paymentSource,
        existing.creditCardId ?? existing.cashAdvanceId ?? existing.bankAccountId,
      ),
    expenseKind: formData.get("expenseKind") ?? existing.expenseKind ?? "",
  });
  if (!parsed.success) {
    return { error: "validation" };
  }

  const allowed = categoriesForType(
    parsed.data.type,
    parsed.data.type === "WITHDRAWAL" && parsed.data.expenseKind
      ? parsed.data.expenseKind
      : null,
  );
  if (!allowed.includes(parsed.data.category)) {
    return { error: "validation", fieldError: "category" };
  }

  const pendingFile = formData.get("attachment");
  if (pendingFile instanceof File && pendingFile.size > 0 && !isSupabaseConfigured()) {
    return { error: "storage" };
  }

  const locale = await getLocale();

  try {
    const moved = await updateSourceMovement({
      id: existing.id,
      companyId: user.companyId,
      userId: user.id,
      sourceRaw: parsed.data.paymentSource,
      date: fromDateInputValue(parsed.data.date),
      type: parsed.data.type,
      amount: parsed.data.amount,
      description: parsed.data.description,
      category: parsed.data.category,
      projectId:
        parsed.data.type === "WITHDRAWAL" && parsed.data.expenseKind === "PROJECT"
          ? parsed.data.projectId || null
          : null,
      notes: parsed.data.notes || null,
      expenseKind:
        parsed.data.type === "WITHDRAWAL" && parsed.data.expenseKind
          ? parsed.data.expenseKind
          : null,
      status: existing.status,
    });
    if ("error" in moved) {
      return { error: moved.error === "notFound" ? "notFound" : "source" };
    }
    const updated = moved.row;

    const file = formData.get("attachment");
    if (file instanceof File && file.size > 0) {
      await saveAttachment({
        companyId: user.companyId,
        transactionId: updated.id,
        file,
      });
    }

    await writeAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "update",
      module: "transactions",
      recordId: updated.id,
      oldValue: {
        type: existing.type,
        amount: existing.amount.toString(),
        description: existing.description,
      },
      newValue: {
        type: updated.type,
        amount: updated.amount.toString(),
        description: updated.description,
      },
    });
  } catch (error) {
    console.error("updateTransactionAction", error);
    if (error instanceof Error && error.message === "STORAGE_NOT_CONFIGURED") {
      return { error: "storage" };
    }
    if (error instanceof Error && error.message === "INVALID_FILE") {
      return { error: "validation" };
    }
    return { error: "generic" };
  }

  revalidateFinance(locale);
  redirect({ href: "/transactions", locale });
  return {};
}

export async function voidTransactionAction(id: string): Promise<TransactionActionState> {
  const user = await requirePermission("transactions", "delete");
  const existing = await prisma.bankTransaction.findFirst({
    where: { id, ...companyScope(user.companyId) },
  });
  if (!existing) {
    return { error: "notFound" };
  }
  if (existing.status !== "POSTED") {
    return { error: "immutable" };
  }

  await markSourceMovementStatus(user.companyId, existing.id, "VOIDED");
  await writeAuditLog({
    companyId: user.companyId,
    userId: user.id,
    action: "void",
    module: "transactions",
    recordId: existing.id,
    oldValue: { status: existing.status, amount: existing.amount.toString() },
    newValue: { status: "VOIDED" },
  });

  const locale = await getLocale();
  revalidateFinance(locale);
  return {};
}

export async function reverseTransactionAction(id: string): Promise<TransactionActionState> {
  const user = await requirePermission("transactions", "approve");
  const existing = await prisma.bankTransaction.findFirst({
    where: { id, ...companyScope(user.companyId) },
  });
  if (!existing) {
    return { error: "notFound" };
  }
  if (existing.status !== "POSTED") {
    return { error: "immutable" };
  }

  await markSourceMovementStatus(user.companyId, existing.id, "REVERSED", { applyCustody: false });
  const opposite = existing.type === "DEPOSIT" ? "WITHDRAWAL" : "DEPOSIT";
  const reversed = await createSourceMovement({
    companyId: user.companyId,
    userId: user.id,
    sourceRaw: encodePaymentSource(
      existing.paymentSource,
      existing.creditCardId ?? existing.cashAdvanceId ?? existing.bankAccountId,
    ),
    date: new Date(),
    type: opposite,
    amount: existing.amount.toString(),
    description: existing.description,
    category: existing.category ?? "other",
    projectId: existing.projectId,
    notes: existing.notes,
    expenseKind: existing.expenseKind,
    status: "POSTED",
    isTransfer: existing.isTransfer,
  });
  if ("row" in reversed && reversed.row) {
    await prisma.bankTransaction.update({
      where: { id: reversed.row.id },
      data: { reversedOfId: existing.id },
    });
  }

  await writeAuditLog({
    companyId: user.companyId,
    userId: user.id,
    action: "reverse",
    module: "transactions",
    recordId: existing.id,
    oldValue: { status: "POSTED" },
    newValue: { status: "REVERSED" },
  });

  const locale = await getLocale();
  revalidateFinance(locale);
  return {};
}
