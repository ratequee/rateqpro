import { addFils, subFils, toFils } from "@/lib/formatting/currency";

export type LedgerStatus = "POSTED" | "VOIDED" | "REVERSED";
export type LedgerType = "DEPOSIT" | "WITHDRAWAL";

export type LedgerEntry = {
  type: LedgerType;
  amount: string | number;
  status: LedgerStatus;
};

export type ProjectLedger = {
  contractValue: string | number;
  paymentsReceived: string | number;
  expenses: string | number;
};

export type CashAdvanceLedger = {
  amountIssued: string | number;
  amountSpent: string | number;
  dueDate?: Date | null;
  now?: Date;
};

export type CashFlowInput = {
  actualIncome: string | number;
  actualExpenses: string | number;
  expectedIncome: string | number;
  expectedExpenses: string | number;
};

export type ObligationInput = {
  amount: string | number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
};

export type PayrollAllocationInput = {
  salary: string | number;
  allocations: Array<string | number>;
};

function posted(entries: LedgerEntry[]): LedgerEntry[] {
  return entries.filter((entry) => entry.status === "POSTED");
}

export function calculateBankBalance(entries: LedgerEntry[]): bigint {
  return posted(entries).reduce((balance, entry) => {
    const amount = toFils(entry.amount);
    return entry.type === "DEPOSIT" ? addFils(balance, amount) : subFils(balance, amount);
  }, 0n);
}

export function calculateRevenue(entries: LedgerEntry[]): bigint {
  return posted(entries)
    .filter((entry) => entry.type === "DEPOSIT")
    .reduce((total, entry) => addFils(total, toFils(entry.amount)), 0n);
}

export function calculateExpenses(entries: LedgerEntry[]): bigint {
  return posted(entries)
    .filter((entry) => entry.type === "WITHDRAWAL")
    .reduce((total, entry) => addFils(total, toFils(entry.amount)), 0n);
}

export function calculateNetProfit(entries: LedgerEntry[]): bigint {
  return subFils(calculateRevenue(entries), calculateExpenses(entries));
}

export function calculateProjectProfit(project: ProjectLedger): bigint {
  return subFils(
    subFils(toFils(project.contractValue), toFils(project.expenses)),
    0n,
  );
}

export function calculateOutstandingBalance(project: ProjectLedger): bigint {
  return subFils(toFils(project.contractValue), toFils(project.paymentsReceived));
}

export function calculateExpectedProfit(project: ProjectLedger): bigint {
  return subFils(toFils(project.contractValue), toFils(project.expenses));
}

export function calculateCashAdvanceRemaining(advance: CashAdvanceLedger): bigint {
  return subFils(toFils(advance.amountIssued), toFils(advance.amountSpent));
}

export function isCashAdvanceOverdue(advance: CashAdvanceLedger): boolean {
  if (!advance.dueDate) {
    return false;
  }
  const remaining = calculateCashAdvanceRemaining(advance);
  if (remaining <= 0n) {
    return false;
  }
  const now = advance.now ?? new Date();
  return now.getTime() > advance.dueDate.getTime();
}

export function calculateCashFlow(input: CashFlowInput): {
  currentBalance: bigint;
  expectedNet: bigint;
  forecastBalance: bigint;
} {
  const actualIncome = toFils(input.actualIncome);
  const actualExpenses = toFils(input.actualExpenses);
  const expectedIncome = toFils(input.expectedIncome);
  const expectedExpenses = toFils(input.expectedExpenses);
  const currentBalance = subFils(actualIncome, actualExpenses);
  const expectedNet = subFils(expectedIncome, expectedExpenses);
  return {
    currentBalance,
    expectedNet,
    forecastBalance: addFils(currentBalance, expectedNet),
  };
}

export function calculateMonthlyObligations(items: ObligationInput[]): bigint {
  return items
    .filter((item) => item.status === "ACTIVE")
    .reduce((total, item) => addFils(total, toFils(item.amount)), 0n);
}

export function isPayrollAllocationValid(input: PayrollAllocationInput): boolean {
  const allocated = input.allocations.reduce(
    (total, amount) => addFils(total, toFils(amount)),
    0n,
  );
  return allocated <= toFils(input.salary);
}

export function calculateAllocatedPayroll(input: PayrollAllocationInput): bigint {
  return input.allocations.reduce(
    (total, amount) => addFils(total, toFils(amount)),
    0n,
  );
}
