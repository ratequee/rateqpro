export const TRANSACTION_CATEGORIES = [
  "project_payment",
  "other_income",
  "materials",
  "subcontractors",
  "labor",
  "equipment",
  "transportation",
  "rent",
  "salaries",
  "vehicles",
  "electricity",
  "internet",
  "marketing",
  "other",
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const DEPOSIT_CATEGORIES: TransactionCategory[] = [
  "project_payment",
  "other_income",
];

export const WITHDRAWAL_CATEGORIES: TransactionCategory[] = [
  "materials",
  "subcontractors",
  "labor",
  "equipment",
  "transportation",
  "rent",
  "salaries",
  "vehicles",
  "electricity",
  "internet",
  "marketing",
  "other",
];

export function categoriesForType(
  type: "DEPOSIT" | "WITHDRAWAL",
): TransactionCategory[] {
  return type === "DEPOSIT" ? DEPOSIT_CATEGORIES : WITHDRAWAL_CATEGORIES;
}

export function isTransactionCategory(value: string): value is TransactionCategory {
  return (TRANSACTION_CATEGORIES as readonly string[]).includes(value);
}
