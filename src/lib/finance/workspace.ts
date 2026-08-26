import { prisma } from "@/lib/db/prisma";
import { filsToNumber, toFils } from "@/lib/formatting/currency";
import { calculateRunwayMonths } from "./calculations";
import { getCompanyFinancialSnapshot } from "./engine";

function decimalToFils(value: { toString(): string }): bigint {
  return toFils(value.toString());
}

export async function getDashboardWorkspace(companyId: string) {
  const [snapshot, clientCount, recentWithdrawals, obligationRows] =
    await Promise.all([
      getCompanyFinancialSnapshot(companyId),
      prisma.client.count({ where: { companyId } }),
      prisma.bankTransaction.findMany({
        where: { companyId, type: "WITHDRAWAL", status: "POSTED" },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 5,
        select: {
          id: true,
          description: true,
          amount: true,
          date: true,
          category: true,
          createdBy: { select: { name: true } },
          project: { select: { code: true } },
        },
      }),
      prisma.obligation.findMany({
        where: { companyId, status: "ACTIVE" },
        orderBy: { amount: "desc" },
        select: {
          id: true,
          name: true,
          amount: true,
          category: true,
          nextDueDate: true,
        },
      }),
    ]);

  const runwayMonths = calculateRunwayMonths(
    snapshot.bankBalance,
    snapshot.monthlyObligations,
  );

  return {
    snapshot,
    clientCount,
    recentWithdrawals,
    obligationRows,
    runwayMonths,
  };
}

export async function getBankWorkspace(companyId: string) {
  const [accounts, cards, snapshot] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    }),
    prisma.creditCard.findMany({
      where: { companyId, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    getCompanyFinancialSnapshot(companyId),
  ]);

  return { accounts, cards, snapshot };
}

export async function getClientsWorkspace(companyId: string) {
  const clients = await prisma.client.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: {
      projects: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          contractValue: true,
          transactions: {
            where: { status: "POSTED" },
            select: { type: true, amount: true },
          },
        },
      },
      contracts: {
        select: { value: true },
      },
    },
  });

  return clients.map((client) => {
    const contractValue = client.contracts.reduce(
      (sum, row) => sum + decimalToFils(row.value),
      0n,
    );
    const collected = client.projects.reduce((sum, project) => {
      const deposits = project.transactions
        .filter((row) => row.type === "DEPOSIT")
        .reduce((inner, row) => inner + decimalToFils(row.amount), 0n);
      return sum + deposits;
    }, 0n);
    return {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      projectCount: client.projects.length,
      contractValue,
      collected,
      outstanding: contractValue - collected,
      projects: client.projects,
    };
  });
}

export async function getProjectsWorkspace(companyId: string) {
  const projects = await prisma.project.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true } },
      contracts: { select: { value: true } },
      transactions: {
        where: { status: "POSTED" },
        select: { type: true, amount: true },
      },
    },
  });

  return projects.map((project) => {
    const contractValue =
      project.contracts.reduce((sum, row) => sum + decimalToFils(row.value), 0n) ||
      decimalToFils(project.contractValue);
    const collected = project.transactions
      .filter((row) => row.type === "DEPOSIT")
      .reduce((sum, row) => sum + decimalToFils(row.amount), 0n);
    const spent = project.transactions
      .filter((row) => row.type === "WITHDRAWAL")
      .reduce((sum, row) => sum + decimalToFils(row.amount), 0n);
    const profit = contractValue - spent;
    const collectedPct =
      contractValue > 0n ? (filsToNumber(collected) / filsToNumber(contractValue)) * 100 : 0;
    const profitPct =
      contractValue > 0n ? (filsToNumber(profit) / filsToNumber(contractValue)) * 100 : 0;
    return {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      clientName: project.client?.name ?? null,
      contractValue,
      collected,
      spent,
      profit,
      collectedPct,
      profitPct,
    };
  });
}

export async function getReportsWorkspace(companyId: string) {
  const snapshot = await getCompanyFinancialSnapshot(companyId);
  const withdrawals = await prisma.bankTransaction.findMany({
    where: { companyId, type: "WITHDRAWAL", status: "POSTED" },
    select: { amount: true, category: true, description: true },
  });

  const byCategory = new Map<string, bigint>();
  for (const row of withdrawals) {
    const key = row.category ?? "other";
    byCategory.set(key, (byCategory.get(key) ?? 0n) + decimalToFils(row.amount));
  }

  return {
    snapshot,
    expenseLines: [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => Number(b.amount - a.amount)),
  };
}

export async function getEmployeesWorkspace(companyId: string) {
  const [employees, payrolls, snapshot] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    }),
    prisma.payroll.findMany({
      where: { companyId },
      orderBy: { periodStart: "desc" },
      take: 20,
      include: { employee: { select: { name: true } } },
    }),
    getCompanyFinancialSnapshot(companyId),
  ]);

  const totalPayroll = employees
    .filter((item) => item.status === "ACTIVE")
    .reduce((sum, item) => sum + decimalToFils(item.salary), 0n);

  return { employees, payrolls, totalPayroll, snapshot };
}

export async function getAssetsWorkspace(companyId: string) {
  const [assets, advances] = await Promise.all([
    prisma.asset.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cashAdvance.findMany({
      where: { companyId },
      orderBy: { issueDate: "desc" },
    }),
  ]);

  const totalValue = assets.reduce(
    (sum, item) => sum + decimalToFils(item.currentValue),
    0n,
  );
  const vehicles = assets.filter((item) => item.category === "VEHICLES");
  const equipment = assets.filter((item) => item.category === "EQUIPMENT");
  const openCustody = advances
    .filter((item) => item.status === "OPEN" || item.status === "PARTIALLY_SETTLED")
    .reduce(
      (sum, item) =>
        sum + decimalToFils(item.amountIssued) - decimalToFils(item.amountSpent),
      0n,
    );

  return { assets, advances, totalValue, vehicles, equipment, openCustody };
}
