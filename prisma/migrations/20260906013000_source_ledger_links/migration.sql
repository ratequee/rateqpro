-- Card / custody movements are not booked against a bank account.
ALTER TABLE "BankTransaction" ALTER COLUMN "bankAccountId" DROP NOT NULL;

ALTER TABLE "BankTransaction" ADD COLUMN "isTransfer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BankTransaction" ADD COLUMN "creditCardTransactionId" TEXT;

CREATE UNIQUE INDEX "BankTransaction_creditCardTransactionId_key" ON "BankTransaction"("creditCardTransactionId");

ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_creditCardTransactionId_fkey" FOREIGN KEY ("creditCardTransactionId") REFERENCES "CreditCardTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
