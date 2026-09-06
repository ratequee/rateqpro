import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { TRANSACTION_PAGE_SIZE } from "@/lib/finance/config";
import { calculateBankBalance, calculateExpenses, calculateRevenue } from "@/lib/finance/calculations";

export type TransactionListQuery = {
  companyId: string;
  search?: string;
  type?: "DEPOSIT" | "WITHDRAWAL" | "ALL";
  status?: "PENDING" | "POSTED" | "VOIDED" | "REVERSED" | "ALL";
  projectId?: string;
  category?: string;
  from?: string;
  to?: string;
  page?: number;
  sort?: "date" | "amount";
  dir?: "asc" | "desc";
};

function buildWhere(query: TransactionListQuery): Prisma.BankTransactionWhereInput {
  const where: Prisma.BankTransactionWhereInput = {
    ...companyScope(query.companyId),
  };

  if (query.type && query.type !== "ALL") {
    where.type = query.type;
  }
  if (query.status && query.status !== "ALL") {
    where.status = query.status;
  }
  if (query.projectId) {
    where.projectId = query.projectId;
  }
  if (query.category) {
    where.category = query.category;
  }
  if (query.from || query.to) {
    where.date = {};
    if (query.from) {
      where.date.gte = new Date(`${query.from}T00:00:00.000Z`);
    }
    if (query.to) {
      where.date.lte = new Date(`${query.to}T00:00:00.000Z`);
    }
  }
  if (query.search?.trim()) {
    const q = query.search.trim();
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function nextTransactionReference(
  companyId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> {
  const last = await db.bankTransaction.findFirst({
    where: companyScope(companyId),
    orderBy: { createdAt: "desc" },
    select: { reference: true },
  });
  const current = last?.reference.match(/^TX-(\d+)$/)?.[1];
  const next = current ? Number(current) + 1 : 1;
  return `TX-${String(next).padStart(5, "0")}`;
}

export async function listTransactions(query: TransactionListQuery) {
  const page = Math.max(query.page ?? 1, 1);
  const where = buildWhere(query);
  const sortField = query.sort === "amount" ? "amount" : "date";
  const sortDir = query.dir === "asc" ? "asc" : "desc";

  const [rows, total, allMatching] = await Promise.all([
    prisma.bankTransaction.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        bankAccount: { select: { id: true, name: true } },
        creditCard: { select: { id: true, name: true, last4: true } },
        cashAdvance: { select: { id: true, personName: true } },
      },
      orderBy: [{ [sortField]: sortDir }, { createdAt: "desc" }],
      skip: (page - 1) * TRANSACTION_PAGE_SIZE,
      take: TRANSACTION_PAGE_SIZE,
    }),
    prisma.bankTransaction.count({ where }),
    prisma.bankTransaction.findMany({
      where,
      select: { type: true, amount: true, status: true, paymentSource: true, isTransfer: true },
    }),
  ]);

  const ledger = allMatching.map((row) => ({
    type: row.type,
    amount: row.amount.toString(),
    status: row.status,
    paymentSource: row.paymentSource,
    isTransfer: row.isTransfer,
  }));

  return {
    rows: rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      date: row.date.toISOString(),
      type: row.type,
      amount: row.amount.toString(),
      description: row.description,
      category: row.category,
      status: row.status,
      paymentSource: row.paymentSource,
      sourceLabel:
        row.paymentSource === "CASH"
          ? "Cash"
          : row.creditCard
            ? row.creditCard.last4
              ? `${row.creditCard.name} ••${row.creditCard.last4}`
              : row.creditCard.name
            : row.cashAdvance
              ? row.cashAdvance.personName
              : (row.bankAccount?.name ?? "—"),
      project: row.project,
      createdBy: { name: row.createdBy.name },
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / TRANSACTION_PAGE_SIZE)),
    totals: {
      deposits: calculateRevenue(ledger),
      withdrawals: calculateExpenses(ledger),
      net: calculateBankBalance(ledger),
    },
  };
}

export async function getTransaction(companyId: string, id: string) {
  return prisma.bankTransaction.findFirst({
    where: { id, ...companyScope(companyId) },
    include: {
      project: { select: { id: true, code: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      bankAccount: { select: { id: true, name: true } },
      creditCard: { select: { id: true, name: true, last4: true } },
      cashAdvance: { select: { id: true, personName: true } },
    },
  });
}

export async function listCompanyProjects(companyId: string) {
  return prisma.project.findMany({
    where: companyScope(companyId),
    select: { id: true, code: true, name: true, status: true },
    orderBy: { code: "asc" },
  });
}

export async function getPrimaryBankAccount(companyId: string) {
  const primary = await prisma.bankAccount.findFirst({
    where: { ...companyScope(companyId), isPrimary: true, isActive: true },
  });
  if (primary) {
    return primary;
  }
  return prisma.bankAccount.findFirst({
    where: { ...companyScope(companyId), isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function listBankAccounts(companyId: string) {
  return prisma.bankAccount.findMany({
    where: { ...companyScope(companyId), isActive: true },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });
}

export async function listTransactionAttachments(companyId: string, transactionId: string) {
  return prisma.attachment.findMany({
    where: {
      ...companyScope(companyId),
      ownerType: "TRANSACTION",
      ownerId: transactionId,
    },
    orderBy: { createdAt: "desc" },
  });
}
