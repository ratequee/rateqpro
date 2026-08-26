import type { ObligationCategory, ObligationFrequency } from "@prisma/client";
import type { TransactionCategory } from "./categories";

export function addUtcMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function advanceObligationDueDate(
  from: Date,
  frequency: ObligationFrequency,
): Date {
  if (frequency === "MONTHLY") {
    return addUtcMonths(from, 1);
  }
  if (frequency === "QUARTERLY") {
    return addUtcMonths(from, 3);
  }
  if (frequency === "YEARLY") {
    return addUtcMonths(from, 12);
  }
  return from;
}

export function obligationToExpenseCategory(
  category: ObligationCategory,
): TransactionCategory {
  if (category === "SALARIES") {
    return "salaries";
  }
  if (category === "RENT" || category === "HOUSING") {
    return "rent";
  }
  if (category === "VEHICLES") {
    return "vehicles";
  }
  return "other";
}
