import { z } from "zod";
import { TRANSACTION_CATEGORIES } from "@/lib/finance/categories";

export const transactionFormSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
    amount: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
    description: z.string().trim().min(2).max(240),
    category: z.enum(TRANSACTION_CATEGORIES),
    projectId: z.string().optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    bankAccountId: z.string().optional().or(z.literal("")),
    paymentSource: z.string().min(1),
    expenseKind: z.enum(["PROJECT", "OPERATING", ""]).optional(),
  })
  .refine(
    (data) =>
      data.type !== "WITHDRAWAL" || data.expenseKind !== "PROJECT" || Boolean(data.projectId),
  );

export type TransactionFormInput = z.infer<typeof transactionFormSchema>;
