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
import { getPrimaryBankAccount, nextTransactionReference } from "@/services/transactions";
import {
  attachmentStorageKey,
  isAllowedAttachment,
  uploadPrivateAttachment,
} from "@/lib/supabase/storage";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { redirect } from "@/i18n/navigation";

export type TransactionActionState = {
  error?: "validation" | "forbidden" | "notFound" | "storage" | "generic" | "immutable";
  fieldError?: string;
};

function revalidateFinance(locale: string) {
  revalidatePath(`/${locale}/transactions`);
  revalidatePath(`/${locale}/dashboard`);
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
    bankAccountId: formData.get("bankAccountId"),
  });

  if (!parsed.success) {
    return { error: "validation" };
  }

  const allowed = categoriesForType(parsed.data.type);
  if (!allowed.includes(parsed.data.category)) {
    return { error: "validation", fieldError: "category" };
  }

  const account =
    (await prisma.bankAccount.findFirst({
      where: { id: parsed.data.bankAccountId, ...companyScope(user.companyId) },
    })) ?? (await getPrimaryBankAccount(user.companyId));

  if (!account) {
    return { error: "generic" };
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

  try {
    const created = await prisma.bankTransaction.create({
      data: {
        companyId: user.companyId,
        bankAccountId: account.id,
        projectId: parsed.data.projectId || null,
        reference: await nextTransactionReference(user.companyId),
        date: fromDateInputValue(parsed.data.date),
        type: parsed.data.type,
        amount: parsed.data.amount,
        description: parsed.data.description,
        category: parsed.data.category,
        notes: parsed.data.notes || null,
        status: "POSTED",
        createdById: user.id,
      },
    });

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
  if (existing.status !== "POSTED") {
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
    bankAccountId: formData.get("bankAccountId") || existing.bankAccountId,
  });
  if (!parsed.success) {
    return { error: "validation" };
  }

  const allowed = categoriesForType(parsed.data.type);
  if (!allowed.includes(parsed.data.category)) {
    return { error: "validation", fieldError: "category" };
  }

  const pendingFile = formData.get("attachment");
  if (pendingFile instanceof File && pendingFile.size > 0 && !isSupabaseConfigured()) {
    return { error: "storage" };
  }

  const locale = await getLocale();

  try {
    const updated = await prisma.bankTransaction.update({
      where: { id: existing.id },
      data: {
        date: fromDateInputValue(parsed.data.date),
        type: parsed.data.type,
        amount: parsed.data.amount,
        description: parsed.data.description,
        category: parsed.data.category,
        projectId: parsed.data.projectId || null,
        notes: parsed.data.notes || null,
      },
    });

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

  await prisma.bankTransaction.update({
    where: { id: existing.id },
    data: { status: "VOIDED", voidedAt: new Date() },
  });
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

  await prisma.$transaction(async (tx) => {
    await tx.bankTransaction.update({
      where: { id: existing.id },
      data: { status: "REVERSED" },
    });
    await tx.bankTransaction.create({
      data: {
        companyId: user.companyId,
        bankAccountId: existing.bankAccountId,
        projectId: existing.projectId,
        reference: await nextTransactionReference(user.companyId, tx),
        date: new Date(),
        type: existing.type === "DEPOSIT" ? "WITHDRAWAL" : "DEPOSIT",
        amount: existing.amount,
        description: existing.description,
        category: existing.category,
        notes: existing.notes,
        status: "POSTED",
        reversedOfId: existing.id,
        createdById: user.id,
      },
    });
  });

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
