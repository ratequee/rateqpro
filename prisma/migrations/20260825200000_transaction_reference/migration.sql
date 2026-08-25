-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN "reference" TEXT;

UPDATE "BankTransaction"
SET "reference" = 'TX-' || UPPER(SUBSTRING("id" FROM 1 FOR 8))
WHERE "reference" IS NULL;

ALTER TABLE "BankTransaction" ALTER COLUMN "reference" SET NOT NULL;

CREATE UNIQUE INDEX "BankTransaction_companyId_reference_key" ON "BankTransaction"("companyId", "reference");
