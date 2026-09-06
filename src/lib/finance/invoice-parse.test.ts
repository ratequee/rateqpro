import { describe, expect, it } from "vitest";
import { parseInvoiceText } from "./invoice-parse";

describe("parseInvoiceText", () => {
  it("extracts amount, date, vendor, and invoice number from a QAR invoice", () => {
    const text = `
      Al Maha Building Materials
      Invoice No: INV-2044
      Date: 12/03/2026
      Description: Cement and steel
      Total: QAR 1,250.50
    `;
    const result = parseInvoiceText(text);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe("1250.50");
    expect(result?.date).toBe("2026-03-12");
    expect(result?.invoiceNumber).toBe("INV-2044");
    expect(result?.type).toBe("WITHDRAWAL");
    expect(result?.category).toBe("materials");
    expect(result?.description).toContain("Al Maha");
  });

  it("treats received client payments as deposits", () => {
    const text = `
      Payment received
      Client payment
      Date 2026-04-01
      Amount QAR 8000
    `;
    const result = parseInvoiceText(text);
    expect(result?.type).toBe("DEPOSIT");
    expect(result?.category).toBe("project_payment");
    expect(result?.amount).toBe("8000.00");
  });

  it("returns null when no amount can be found", () => {
    expect(parseInvoiceText("just a note without money")).toBeNull();
  });
});
