import { z } from "zod";

export const moneySchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Invalid amount");

export const optionalText = z.string().trim().max(2000).optional().or(z.literal(""));

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const clientFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  notes: optionalText,
});

export const projectFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().max(40).optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  contractValue: moneySchema,
  startDate: dateSchema.optional().or(z.literal("")),
  endDate: dateSchema.optional().or(z.literal("")),
  status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]),
  notes: optionalText,
});

export const bankAccountFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(120),
  bankName: z.string().trim().max(120).optional().or(z.literal("")),
  accountNo: z.string().trim().max(40).optional().or(z.literal("")),
  isPrimary: z.enum(["true", "false"]).optional(),
});

export const creditCardFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(120),
  last4: z
    .string()
    .trim()
    .regex(/^\d{4}$/)
    .optional()
    .or(z.literal("")),
});

export const obligationFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(160),
  category: z.enum(["SALARIES", "RENT", "HOUSING", "VEHICLES", "SUBSCRIPTIONS", "OTHER"]),
  amount: moneySchema,
  frequency: z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"]),
  dueDate: dateSchema,
  reminderDays: z.string().trim().regex(/^\d+$/).optional().or(z.literal("")),
  notes: optionalText,
});

export const employeeFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(160),
  position: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  joiningDate: dateSchema.optional().or(z.literal("")),
  salary: moneySchema,
  status: z.enum(["ACTIVE", "INACTIVE"]),
  notes: optionalText,
});

export const assetFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(160),
  category: z.enum(["VEHICLES", "EQUIPMENT", "FURNITURE", "DEVICES", "OTHER"]),
  purchaseDate: dateSchema.optional().or(z.literal("")),
  purchaseValue: moneySchema,
  currentValue: moneySchema.optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISPOSED", "UNDER_MAINTENANCE"]),
  notes: optionalText,
});

export const cashAdvanceFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  personName: z.string().trim().min(2).max(160),
  amountIssued: moneySchema,
  issueDate: dateSchema,
  dueDate: dateSchema.optional().or(z.literal("")),
  notes: optionalText,
});

export const documentFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().max(40).optional().or(z.literal("")),
  expiryDate: dateSchema.optional().or(z.literal("")),
  notes: optionalText,
});

export const userFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email(),
  password: z.string().min(8).optional().or(z.literal("")),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export const payrollFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  employeeId: z.string().min(1),
  periodStart: dateSchema,
  periodEnd: dateSchema,
  salary: moneySchema,
  notes: optionalText,
});

export const expenseFormSchema = z
  .object({
    id: z.string().optional().or(z.literal("")),
    kind: z.enum(["PROJECT", "OPERATING"]),
    projectId: z.string().optional().or(z.literal("")),
    date: dateSchema,
    amount: moneySchema,
    category: z.string().trim().min(1).max(40),
    description: z.string().trim().min(2).max(240),
    notes: optionalText,
    paymentSource: z.string().min(1),
  })
  .refine((data) => data.kind !== "PROJECT" || Boolean(data.projectId));

export const cardMovementSchema = z.object({
  creditCardId: z.string().min(1),
  kind: z.enum(["TOPUP", "CHARGE"]),
  amount: moneySchema,
  date: dateSchema,
  description: z.string().trim().min(2).max(240),
  notes: optionalText,
  fundFrom: z.string().optional().or(z.literal("")),
});

export const salaryRowSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  employeeId: z.string().min(1),
  periodStart: dateSchema,
  periodEnd: dateSchema,
  basicSalary: moneySchema,
  foodAllowance: moneySchema.optional().or(z.literal("")),
  accommodationAllowance: moneySchema.optional().or(z.literal("")),
  overtime: moneySchema.optional().or(z.literal("")),
  deductions: moneySchema.optional().or(z.literal("")),
  allocations: z.string().optional().or(z.literal("")),
});

export const employeeDocumentSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  kind: z.enum(["NORMAL", "EXPIRING"]),
  expiryDate: dateSchema.optional().or(z.literal("")),
  notes: optionalText,
});

export const projectPaymentSchema = z.object({
  projectId: z.string().min(1),
  amount: moneySchema,
  dueDate: dateSchema,
  notes: optionalText,
});

export const teamPermissionsSchema = z.object({
  userId: z.string().min(1),
  keys: z.array(z.string()),
});

export const bankImportSchema = z.object({
  bankAccountId: z.string().min(1),
  rows: z
    .array(
      z.object({
        date: z.string().min(4),
        desc: z.string().trim().min(1).max(240),
        debit: z.number().nonnegative(),
        credit: z.number().nonnegative(),
      }),
    )
    .min(1)
    .max(500),
});
