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

export const PROJECT_WITHDRAWAL_CATEGORIES: TransactionCategory[] = [
  "materials",
  "subcontractors",
  "labor",
  "equipment",
  "transportation",
  "other",
];

export const OPERATING_WITHDRAWAL_CATEGORIES: TransactionCategory[] = [
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
  expenseKind?: "PROJECT" | "OPERATING" | null,
): TransactionCategory[] {
  if (type === "DEPOSIT") return DEPOSIT_CATEGORIES;
  if (expenseKind === "PROJECT") return PROJECT_WITHDRAWAL_CATEGORIES;
  if (expenseKind === "OPERATING") return OPERATING_WITHDRAWAL_CATEGORIES;
  return WITHDRAWAL_CATEGORIES;
}

export function isTransactionCategory(value: string): value is TransactionCategory {
  return (TRANSACTION_CATEGORIES as readonly string[]).includes(value);
}
