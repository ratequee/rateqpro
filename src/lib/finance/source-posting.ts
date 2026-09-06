import type { PaymentSourceKind, Prisma, RecordStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { nextTransactionReference } from "@/services/transactions";
import { filsToNumber, toFils } from "@/lib/formatting/currency";
import { ensureCashAccount } from "./cash-account";
import { parsePaymentSource } from "./payment-source";

type Db = Prisma.TransactionClient | typeof prisma;

export type ResolvedSource = {
  kind: PaymentSourceKind;
  bankAccountId: string | null;
  creditCardId: string | null;
  cashAdvanceId: string | null;
};

export function isCashLikeSource(kind: PaymentSourceKind) {
  return kind === "BANK_ACCOUNT" || kind === "CASH";
}

export async function resolvePaymentSource(
  companyId: string,
  raw: string,
  db: Db = prisma,
): Promise<ResolvedSource | null> {
  const parsed = parsePaymentSource(raw);
  if (parsed.kind === "CASH") {
    const cash = await ensureCashAccount(companyId);
    return {
      kind: "CASH",
      bankAccountId: cash.id,
      creditCardId: null,
      cashAdvanceId: null,
    };
  }
  if (parsed.kind === "BANK_ACCOUNT" && parsed.id) {
    const account = await db.bankAccount.findFirst({
      where: { id: parsed.id, ...companyScope(companyId) },
    });
    if (!account) return null;
    return {
      kind: "BANK_ACCOUNT",
      bankAccountId: account.id,
      creditCardId: null,
      cashAdvanceId: null,
    };
  }
  if (parsed.kind === "CREDIT_CARD" && parsed.id) {
    const card = await db.creditCard.findFirst({
      where: { id: parsed.id, ...companyScope(companyId) },
    });
    if (!card) return null;
    return {
      kind: "CREDIT_CARD",
      bankAccountId: null,
      creditCardId: card.id,
      cashAdvanceId: null,
    };
  }
  if (parsed.kind === "CUSTODY" && parsed.id) {
    const advance = await db.cashAdvance.findFirst({
      where: { id: parsed.id, ...companyScope(companyId) },
    });
    if (!advance) return null;
    return {
      kind: "CUSTODY",
      bankAccountId: null,
      creditCardId: null,
      cashAdvanceId: advance.id,
    };
  }
  return null;
}

async function refreshCustodyStatus(db: Db, companyId: string, cashAdvanceId: string) {
  const advance = await db.cashAdvance.findFirst({
    where: { id: cashAdvanceId, ...companyScope(companyId) },
  });
  if (!advance) return;
  const remaining = toFils(advance.amountIssued.toString()) - toFils(advance.amountSpent.toString());
  const spent = toFils(advance.amountSpent.toString());
  const status =
    remaining <= 0n ? "SETTLED" : spent > 0n ? "PARTIALLY_SETTLED" : "OPEN";
  if (advance.status !== status && advance.status !== "OVERDUE") {
    await db.cashAdvance.update({
      where: { id: advance.id },
      data: { status },
    });
  }
}

export async function applyCustodyDelta(
  db: Db,
  companyId: string,
  cashAdvanceId: string,
  type: TransactionType,
  amount: string,
  direction: 1 | -1,
) {
  const advance = await db.cashAdvance.findFirst({
    where: { id: cashAdvanceId, ...companyScope(companyId) },
  });
  if (!advance) return;
  const issued = toFils(advance.amountIssued.toString());
  const spent = toFils(advance.amountSpent.toString());
  const delta = toFils(amount);
  const signed = type === "WITHDRAWAL" ? delta : -delta;
  let next = spent + signed * BigInt(direction);
  if (next < 0n) next = 0n;
  if (next > issued) next = issued;
  await db.cashAdvance.update({
    where: { id: advance.id },
    data: { amountSpent: filsToNumber(next).toFixed(2) },
  });
  await refreshCustodyStatus(db, companyId, cashAdvanceId);
}

async function upsertCardTransaction(
  db: Db,
  input: {
    companyId: string;
    creditCardId: string;
    existingId?: string | null;
    date: Date;
    description: string;
    amount: string;
    category: string | null;
    type: TransactionType;
    status: RecordStatus;
    notes: string | null;
  },
) {
  const data = {
    date: input.date,
    description: input.description,
    amount: input.amount,
    category: input.category,
    kind: input.type === "DEPOSIT" ? "TOPUP" : "CHARGE",
    status: input.status,
    notes: input.notes,
  };
  if (input.existingId) {
    await db.creditCardTransaction.updateMany({
      where: { id: input.existingId, ...companyScope(input.companyId) },
      data,
    });
    return input.existingId;
  }
  const created = await db.creditCardTransaction.create({
    data: {
      companyId: input.companyId,
      creditCardId: input.creditCardId,
      ...data,
    },
  });
  return created.id;
}

export type SourceMovementInput = {
  companyId: string;
  userId: string;
  sourceRaw: string;
  date: Date;
  type: TransactionType;
  amount: string;
  description: string;
  category: string;
  projectId?: string | null;
  notes?: string | null;
  expenseKind?: "PROJECT" | "OPERATING" | null;
  status: RecordStatus;
  isTransfer?: boolean;
};

export async function createSourceMovement(input: SourceMovementInput) {
  const source = await resolvePaymentSource(input.companyId, input.sourceRaw);
  if (!source) {
    return { error: "source" as const };
  }

  const created = await prisma.$transaction(async (tx) => {
    const cardTxnId = source.creditCardId
      ? await upsertCardTransaction(tx, {
          companyId: input.companyId,
          creditCardId: source.creditCardId,
          date: input.date,
          description: input.description,
          amount: input.amount,
          category: input.category,
          type: input.type,
          status: input.status,
          notes: input.notes ?? null,
        })
      : null;

    const row = await tx.bankTransaction.create({
      data: {
        companyId: input.companyId,
        bankAccountId: source.bankAccountId,
        projectId: input.projectId || null,
        paymentSource: source.kind,
        expenseKind: input.expenseKind ?? null,
        isTransfer: input.isTransfer ?? false,
        creditCardId: source.creditCardId,
        cashAdvanceId: source.cashAdvanceId,
        creditCardTransactionId: cardTxnId,
        reference: await nextTransactionReference(input.companyId, tx),
        date: input.date,
        type: input.type,
        amount: input.amount,
        description: input.description,
        category: input.category,
        notes: input.notes || null,
        status: input.status,
        createdById: input.userId,
      },
    });

    if (input.status === "POSTED" && source.cashAdvanceId) {
      await applyCustodyDelta(tx, input.companyId, source.cashAdvanceId, input.type, input.amount, 1);
    }

    return row;
  });

  return { row: created };
}

export async function updateSourceMovement(input: SourceMovementInput & { id: string }) {
  const existing = await prisma.bankTransaction.findFirst({
    where: { id: input.id, ...companyScope(input.companyId) },
  });
  if (!existing) {
    return { error: "notFound" as const };
  }
  const source = await resolvePaymentSource(input.companyId, input.sourceRaw);
  if (!source) {
    return { error: "source" as const };
  }

  await prisma.$transaction(async (tx) => {
    if (existing.status === "POSTED" && existing.cashAdvanceId) {
      await applyCustodyDelta(
        tx,
        input.companyId,
        existing.cashAdvanceId,
        existing.type,
        existing.amount.toString(),
        -1,
      );
    }

    const cardTxnId = source.creditCardId
      ? await upsertCardTransaction(tx, {
          companyId: input.companyId,
          creditCardId: source.creditCardId,
          existingId: existing.creditCardTransactionId,
          date: input.date,
          description: input.description,
          amount: input.amount,
          category: input.category,
          type: input.type,
          status: existing.status,
          notes: input.notes ?? null,
        })
      : null;

    if (!source.creditCardId && existing.creditCardTransactionId) {
      await tx.creditCardTransaction.updateMany({
        where: { id: existing.creditCardTransactionId, ...companyScope(input.companyId) },
        data: { status: "VOIDED" },
      });
    }

    await tx.bankTransaction.update({
      where: { id: existing.id },
      data: {
        bankAccountId: source.bankAccountId,
        projectId: input.projectId || null,
        paymentSource: source.kind,
        expenseKind: input.expenseKind ?? null,
        creditCardId: source.creditCardId,
        cashAdvanceId: source.cashAdvanceId,
        creditCardTransactionId: cardTxnId,
        date: input.date,
        type: input.type,
        amount: input.amount,
        description: input.description,
        category: input.category,
        notes: input.notes || null,
      },
    });

    if (existing.status === "POSTED" && source.cashAdvanceId) {
      await applyCustodyDelta(tx, input.companyId, source.cashAdvanceId, input.type, input.amount, 1);
    }
  });

  return { row: existing };
}

export async function markSourceMovementStatus(
  companyId: string,
  id: string,
  status: "POSTED" | "VOIDED" | "REVERSED",
  options: { applyCustody?: boolean } = {},
) {
  const existing = await prisma.bankTransaction.findFirst({
    where: { id, ...companyScope(companyId) },
  });
  if (!existing) return null;

  await prisma.$transaction(async (tx) => {
    const applyCustody = options.applyCustody ?? true;
    if (applyCustody && existing.status === "POSTED" && existing.cashAdvanceId && status !== "POSTED") {
      await applyCustodyDelta(
        tx,
        companyId,
        existing.cashAdvanceId,
        existing.type,
        existing.amount.toString(),
        -1,
      );
    }
    if (applyCustody && existing.status === "PENDING" && status === "POSTED" && existing.cashAdvanceId) {
      await applyCustodyDelta(
        tx,
        companyId,
        existing.cashAdvanceId,
        existing.type,
        existing.amount.toString(),
        1,
      );
    }
    await tx.bankTransaction.update({
      where: { id: existing.id },
      data: {
        status,
        voidedAt: status === "VOIDED" ? new Date() : existing.voidedAt,
      },
    });
    if (existing.creditCardTransactionId) {
      await tx.creditCardTransaction.updateMany({
        where: { id: existing.creditCardTransactionId, ...companyScope(companyId) },
        data: { status },
      });
    }
    await tx.expense.updateMany({
      where: { transactionId: existing.id, ...companyScope(companyId) },
      data: { status, voidedAt: status === "VOIDED" ? new Date() : undefined },
    });
  });

  return existing;
}
