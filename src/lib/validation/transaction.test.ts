import { describe, expect, it } from "vitest";
import { transactionFormSchema } from "./transaction";

describe("transaction form validation", () => {
  it("accepts a posted deposit", () => {
    const result = transactionFormSchema.safeParse({
      date: "2026-08-25",
      type: "DEPOSIT",
      amount: "25000.50",
      description: "Project payment",
      category: "project_payment",
      projectId: "",
      notes: "",
      bankAccountId: "acc_1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid amount", () => {
    const result = transactionFormSchema.safeParse({
      date: "2026-08-25",
      type: "WITHDRAWAL",
      amount: "-10",
      description: "Rent",
      category: "rent",
      bankAccountId: "acc_1",
    });
    expect(result.success).toBe(false);
  });
});
