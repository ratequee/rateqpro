-- CreateEnum
CREATE TYPE "PaymentSourceKind" AS ENUM ('BANK_ACCOUNT', 'CREDIT_CARD', 'CASH', 'CUSTODY');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('NORMAL', 'EXPIRING');

-- AlterEnum
ALTER TYPE "RecordStatus" ADD VALUE 'PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'TRANSACTION_PENDING';
ALTER TYPE "AttachmentOwnerType" ADD VALUE 'EMPLOYEE_DOCUMENT';

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL DEFAULT 'NORMAL',
    "expiryDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectPayment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidAt" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPayment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN "paymentSource" "PaymentSourceKind" NOT NULL DEFAULT 'BANK_ACCOUNT';
ALTER TABLE "BankTransaction" ADD COLUMN "expenseKind" "ExpenseKind";
ALTER TABLE "BankTransaction" ADD COLUMN "creditCardId" TEXT;
ALTER TABLE "BankTransaction" ADD COLUMN "cashAdvanceId" TEXT;

ALTER TABLE "Expense" ADD COLUMN "paymentSource" "PaymentSourceKind" NOT NULL DEFAULT 'BANK_ACCOUNT';
ALTER TABLE "Expense" ADD COLUMN "bankAccountId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "creditCardId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "cashAdvanceId" TEXT;

ALTER TABLE "Payroll" ADD COLUMN "basicSalary" DECIMAL(19,4) NOT NULL DEFAULT 0;
ALTER TABLE "Payroll" ADD COLUMN "foodAllowance" DECIMAL(19,4) NOT NULL DEFAULT 0;
ALTER TABLE "Payroll" ADD COLUMN "accommodationAllowance" DECIMAL(19,4) NOT NULL DEFAULT 0;
ALTER TABLE "Payroll" ADD COLUMN "overtime" DECIMAL(19,4) NOT NULL DEFAULT 0;
ALTER TABLE "Payroll" ADD COLUMN "deductions" DECIMAL(19,4) NOT NULL DEFAULT 0;
ALTER TABLE "Payroll" ADD COLUMN "status" "RecordStatus" NOT NULL DEFAULT 'POSTED';

UPDATE "Payroll" SET "basicSalary" = "salary" WHERE "basicSalary" = 0 AND "salary" > 0;

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_key_key" ON "UserPermission"("userId", "key");
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");
CREATE INDEX "EmployeeDocument_companyId_idx" ON "EmployeeDocument"("companyId");
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");
CREATE INDEX "EmployeeDocument_companyId_expiryDate_idx" ON "EmployeeDocument"("companyId", "expiryDate");
CREATE INDEX "ProjectPayment_companyId_dueDate_idx" ON "ProjectPayment"("companyId", "dueDate");
CREATE INDEX "ProjectPayment_projectId_idx" ON "ProjectPayment"("projectId");
CREATE INDEX "BankTransaction_creditCardId_idx" ON "BankTransaction"("creditCardId");
CREATE INDEX "BankTransaction_cashAdvanceId_idx" ON "BankTransaction"("cashAdvanceId");
CREATE INDEX "Expense_bankAccountId_idx" ON "Expense"("bankAccountId");
CREATE INDEX "Expense_creditCardId_idx" ON "Expense"("creditCardId");

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectPayment" ADD CONSTRAINT "ProjectPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectPayment" ADD CONSTRAINT "ProjectPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_cashAdvanceId_fkey" FOREIGN KEY ("cashAdvanceId") REFERENCES "CashAdvance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_cashAdvanceId_fkey" FOREIGN KEY ("cashAdvanceId") REFERENCES "CashAdvance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
