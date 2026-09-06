import { prisma } from "@/lib/db/prisma";
import { filsToNumber, toFils } from "@/lib/formatting/currency";
import { LOW_CASH_THRESHOLD } from "./config";
import {
  calculateBankBalance,
  calculateCashFlow,
  calculateExpenses,
  calculateMonthlyObligations,
  calculateNetProfit,
  calculateRevenue,
  type LedgerEntry,
} from "./calculations";

function toLedger(
  rows: Array<{
    type: "DEPOSIT" | "WITHDRAWAL";
    amount: { toString(): string };
    status: "PENDING" | "POSTED" | "VOIDED" | "REVERSED";
    paymentSource?: LedgerEntry["paymentSource"];
    isTransfer?: boolean;
  }>,
): LedgerEntry[] {
  return rows.map((row) => ({
    type: row.type,
    amount: row.amount.toString(),
    status: row.status,
    paymentSource: row.paymentSource,
    isTransfer: row.isTransfer,
  }));
}

function decimalToFils(value: { toString(): string }): bigint {
  return toFils(value.toString());
}

export async function getCompanyFinancialSnapshot(companyId: string) {
  const [transactions, obligations, projectCounts, contractCount, recent, cardRows, advances] =
    await Promise.all([
      prisma.bankTransaction.findMany({
        where: { companyId },
        select: { type: true, amount: true, status: true, paymentSource: true, isTransfer: true },
      }),
      prisma.obligation.findMany({
        where: { companyId },
        select: { amount: true, status: true, nextDueDate: true, name: true },
      }),
      prisma.project.groupBy({
        by: ["status"],
        where: { companyId },
        _count: { _all: true },
      }),
      prisma.contract.count({ where: { companyId } }),
      prisma.bankTransaction.findMany({
        where: { companyId, status: "POSTED" },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 8,
        select: {
          id: true,
          reference: true,
          date: true,
          type: true,
          amount: true,
          description: true,
        },
      }),
      prisma.creditCardTransaction.findMany({
        where: { companyId, status: "POSTED" },
        select: { kind: true, amount: true },
      }),
      prisma.cashAdvance.findMany({
        where: { companyId, status: { in: ["OPEN", "PARTIALLY_SETTLED", "OVERDUE"] } },
        select: { amountIssued: true, amountSpent: true },
      }),
    ]);

  const ledger = toLedger(transactions);
  const bankBalance = calculateBankBalance(ledger);
  const revenue = calculateRevenue(ledger);
  const expenses = calculateExpenses(ledger);
  const netProfit = calculateNetProfit(ledger);
  const cardBalance = cardRows.reduce((sum, row) => {
    const amount = decimalToFils(row.amount);
    return row.kind === "TOPUP" || row.kind === "DEPOSIT" ? sum + amount : sum - amount;
  }, 0n);
  const custodyRemaining = advances.reduce(
    (sum, row) => sum + decimalToFils(row.amountIssued) - decimalToFils(row.amountSpent),
    0n,
  );
  const liquidAssets = bankBalance + cardBalance + custodyRemaining;
  const monthlyObligations = calculateMonthlyObligations(
    obligations.map((item) => ({
      amount: item.amount.toString(),
      status: item.status,
    })),
  );
  const cashFlow = calculateCashFlow({
    actualIncome: filsToNumber(revenue),
    actualExpenses: filsToNumber(expenses),
    expectedIncome: 0,
    expectedExpenses: filsToNumber(monthlyObligations),
  });

  const projectTotals = {
    total: projectCounts.reduce((sum, row) => sum + row._count._all, 0),
    active: projectCounts.find((row) => row.status === "ACTIVE")?._count._all ?? 0,
    completed: projectCounts.find((row) => row.status === "COMPLETED")?._count._all ?? 0,
    contracts: contractCount,
  };

  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingObligations = obligations.filter(
    (item) => item.status === "ACTIVE" && item.nextDueDate <= soon,
  );
  const overdueObligations = obligations.filter(
    (item) => item.status === "ACTIVE" && item.nextDueDate < now,
  );

  return {
    bankBalance,
    cardBalance,
    custodyRemaining,
    liquidAssets,
    revenue,
    expenses,
    netProfit,
    expectedProfit: netProfit,
    monthlyObligations,
    cashPosition: cashFlow.currentBalance,
    expectedIncome: 0n,
    expectedExpenses: monthlyObligations,
    forecast: cashFlow.forecastBalance,
    projects: projectTotals,
    recent,
    alerts: {
      lowCash: bankBalance < toFils(LOW_CASH_THRESHOLD),
      upcomingObligations: upcomingObligations.length,
      overdueObligations: overdueObligations.length,
    },
  };
}
