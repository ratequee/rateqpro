import { describe, expect, it } from "vitest";
import {
  calculateBankBalance,
  calculateCashAdvanceRemaining,
  calculateCashFlow,
  calculateExpenses,
  calculateMonthlyObligations,
  calculateNetProfit,
  calculateOutstandingBalance,
  calculateRevenue,
  calculateRunwayMonths,
  isCashAdvanceOverdue,
  isPayrollAllocationValid,
} from "./calculations";
import { filsToNumber, toFils } from "@/lib/formatting/currency";
import { hasPermission, permissionsForRole } from "@/lib/permissions/check";

describe("financial calculations", () => {
  const ledger = [
    { type: "DEPOSIT" as const, amount: "25000", status: "POSTED" as const },
    { type: "DEPOSIT" as const, amount: "10000.50", status: "POSTED" as const },
    { type: "WITHDRAWAL" as const, amount: "8000", status: "POSTED" as const },
    { type: "WITHDRAWAL" as const, amount: "2000", status: "VOIDED" as const },
  ];

  it("calculates bank balance from posted deposits and withdrawals", () => {
    expect(filsToNumber(calculateBankBalance(ledger))).toBe(27000.5);
  });

  it("calculates revenue from posted deposits only", () => {
    expect(filsToNumber(calculateRevenue(ledger))).toBe(35000.5);
  });

  it("calculates expenses from posted withdrawals only", () => {
    expect(filsToNumber(calculateExpenses(ledger))).toBe(8000);
  });

  it("calculates net profit", () => {
    expect(filsToNumber(calculateNetProfit(ledger))).toBe(27000.5);
  });

  it("calculates runway months from cash vs monthly obligations", () => {
    expect(calculateRunwayMonths(toFils("76399"), toFils("24555"))).toBeCloseTo(3.11, 1);
    expect(calculateRunwayMonths(toFils("10000"), 0n)).toBeNull();
  });

  it("calculates outstanding project balance", () => {
    expect(
      filsToNumber(
        calculateOutstandingBalance({
          contractValue: "100000",
          paymentsReceived: "40000",
          expenses: "15000",
        }),
      ),
    ).toBe(60000);
  });

  it("calculates cash advance remaining and overdue state", () => {
    const remaining = calculateCashAdvanceRemaining({
      amountIssued: "5000",
      amountSpent: "1200.25",
    });
    expect(filsToNumber(remaining)).toBe(3799.75);
    expect(
      isCashAdvanceOverdue({
        amountIssued: "5000",
        amountSpent: "1000",
        dueDate: new Date("2024-01-01"),
        now: new Date("2024-02-01"),
      }),
    ).toBe(true);
  });

  it("calculates cash flow actual vs forecast", () => {
    const result = calculateCashFlow({
      actualIncome: "20000",
      actualExpenses: "5000",
      expectedIncome: "8000",
      expectedExpenses: "3000",
    });
    expect(filsToNumber(result.currentBalance)).toBe(15000);
    expect(filsToNumber(result.expectedNet)).toBe(5000);
    expect(filsToNumber(result.forecastBalance)).toBe(20000);
  });

  it("sums active monthly obligations", () => {
    expect(
      filsToNumber(
        calculateMonthlyObligations([
          { amount: "8000", status: "ACTIVE" },
          { amount: "4000", status: "ACTIVE" },
          { amount: "9999", status: "PAUSED" },
        ]),
      ),
    ).toBe(12000);
  });

  it("rejects payroll allocations that exceed salary", () => {
    expect(
      isPayrollAllocationValid({
        salary: "8000",
        allocations: ["5000", "3000"],
      }),
    ).toBe(true);
    expect(
      isPayrollAllocationValid({
        salary: "8000",
        allocations: ["5000", "3500"],
      }),
    ).toBe(false);
  });

  it("converts money without floating-point drift", () => {
    expect(toFils("25.10")).toBe(2510n);
    expect(toFils("25.1")).toBe(2510n);
  });
});

describe("permissions", () => {
  it("gives super admins every permission", () => {
    expect(hasPermission("SUPER_ADMIN", "users", "delete")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "transactions", "approve")).toBe(true);
  });

  it("restricts employees from deleting financial records", () => {
    expect(hasPermission("EMPLOYEE", "dashboard", "view")).toBe(true);
    expect(hasPermission("EMPLOYEE", "transactions", "delete")).toBe(false);
    expect(permissionsForRole("EMPLOYEE")).not.toContain("users.create");
  });

  it("restricts managers from user administration", () => {
    expect(hasPermission("MANAGER", "projects", "create")).toBe(true);
    expect(hasPermission("MANAGER", "users", "delete")).toBe(false);
    expect(hasPermission("MANAGER", "roles", "edit")).toBe(false);
  });
});
