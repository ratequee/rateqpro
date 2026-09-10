import { describe, expect, it } from "vitest";
import { invoiceExtractSchemaShape, mergeInvoiceExtracts, parseInvoiceText } from "./invoice-parse";

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
    expect(result?.description.toLowerCase()).toContain("cement");
    expect(result?.vendor).toContain("Al Maha");
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

  it("reads a LuLu-style Qatar invoice even from noisy OCR", () => {
    const text = `
      6 Lu TRAD] NG © لولو للادوات الصحية والكهربائية nn
      Shop No: 15 Building No.31 Souq Al Furjan
      INVOICE
      BillNo 28147
      Date
      01/09/2026
      Customer Name SAAD INTERNATIONAL
      SN DESCRIPTION QTY UNIT UNIT PRICE AMOUNT
      1 TILE GLUE SALINA 20 KG 20 PCS 14.50 290.00
      2 TILE LEVELING SPACER 1MM 4 PKT 10.00 40.00
      Grand Total 330.00
      Net Total 330.00
    `;
    const result = parseInvoiceText(text);
    expect(result).not.toBeNull();
    expect(result?.date).toBe("2026-09-01");
    expect(result?.amount).toBe("330.00");
    expect(result?.invoiceNumber).toBe("28147");
    expect(result?.description).toBe("TILE GLUE SALINA 20 KG, TILE LEVELING SPACER 1MM");
    expect(result?.notes).toContain("Invoice #28147");
    expect(result?.notes).not.toContain("Invoice #Date");
    expect(result?.notes).not.toMatch(/Items:/);
    expect(result?.vendor.toLowerCase()).toMatch(/lulu|trading|لولو/);
    expect(result?.category).toBe("materials");
  });

  it("keeps only readable item names from messy photo OCR", () => {
    const text = `
      Lulu TRADING
      Billo: 28147     Page 1of1
      SAAD INTERNATIONAL
      TLE GLUE SAUNA T0RG                     7
      TILE LEVELING SPACER 1MM                 4      PRT     104
      Net Total                330.00
    `;
    const result = parseInvoiceText(text);
    expect(result?.invoiceNumber).toBe("28147");
    expect(result?.description).toBe("TILE LEVELING SPACER 1MM");
    expect(result?.description).not.toMatch(/T0RG|SAUNA/i);
    expect(result?.notes).toContain("28147");
    expect(result?.notes).not.toMatch(/Items:/);
  });

  it("replaces a vendor-only AI description with parsed line items", () => {
    const parsed = parseInvoiceText(`
      LuLu TRADING
      BillNo 28147
      Date 01/09/2026
      1 TILE GLUE SALINA 20 KG 20 PCS 14.50 290.00
      2 TILE LEVELING SPACER 1MM 4 PKT 10.00 40.00
      Grand Total 330.00
    `);
    const merged = mergeInvoiceExtracts(
      {
        date: "2026-09-01",
        amount: "330.00",
        description: "LuLu TRADING لولو للادوات الصحية والكهربائية",
        type: "WITHDRAWAL",
        category: "materials",
        notes: "Vendor: LuLu TRADING لولو للادوات الصحية والكهربائية",
        vendor: "LuLu TRADING لولو للادوات الصحية والكهربائية",
        invoiceNumber: "",
        confidence: 0.8,
      },
      parsed,
    );
    expect(merged?.description.toLowerCase()).toContain("tile glue");
    expect(merged?.notes).toContain("Invoice #28147");
    expect(merged?.vendor).toBe("LuLu TRADING");
  });

  it("uses only the description-column items from a standard receipt", () => {
    const text = `
      East Repair Inc.
      1912 Harvest Lane
      New York, NY 12210
      RECEIPT
      Receipt # US-001
      Receipt Date 11/02/2019
      P.O. # 2312/2019
      Due Date 26/02/2019
      Bill To John Smith
      Ship To John Smith
      QTY DESCRIPTION UNIT PRICE AMOUNT
      1 Front and rear brake cables 100.00 100.00
      2 New set of pedal arms 15.00 30.00
      3 Labor 3hrs 5.00 15.00
      Subtotal 145.00
      Sales Tax 6.25% 9.06
      TOTAL $154.06
      Terms & Conditions
      Payment is due within 15 days
      Please make checks payable to: East Repair Inc.
    `;
    const result = parseInvoiceText(text);
    expect(result?.amount).toBe("154.06");
    expect(result?.description).toBe(
      "Front and rear brake cables, New set of pedal arms, Labor 3hrs",
    );
    expect(result?.description).not.toMatch(/subtotal|sales tax|terms|payment/i);
    expect(result?.description).not.toMatch(/^\d/);
  });

  it("strips qty, totals, and terms from messy OCR item dumps", () => {
    const text = `
      East Repair Inc. RECEIPT
      Receipt Date 11/02/2019
      Total $154.06
      1 Frontand rear brake cables
      2 Newsetof pedal ams
      3 Labor 3hrs
      Subtotal
      Sales Tax
      Terms & Conditions
      Payments due within 15 days.
    `;
    const result = parseInvoiceText(text);
    expect(result?.description.toLowerCase()).toContain("front and rear brake cables");
    expect(result?.description.toLowerCase()).toContain("new set of pedal");
    expect(result?.description.toLowerCase()).toContain("labor 3hrs");
    expect(result?.description).not.toMatch(/subtotal|sales tax|terms|payment/i);
    expect(result?.description).not.toMatch(/\b[123]\s+Front/i);
  });

  it("keeps only description-column names when AI dumps totals into items", () => {
    const result = invoiceExtractSchemaShape({
      date: "2019-02-11",
      amount: "154.06",
      description:
        "1 Frontand rear brake cables, 2 Newsetof pedal ams, Subtotal, Sales Tax, Terms & Conditions, Payments due within 15 days.",
      type: "WITHDRAWAL",
      category: "materials",
      notes: "Vendor: East Repair Inc. RECEIPT",
      vendor: "East Repair Inc.",
      invoiceNumber: "US-001",
      items: [
        "1 Frontand rear brake cables",
        "2 Newsetof pedal ams",
        "Labor 3hrs",
        "Subtotal",
        "Sales Tax",
        "Terms & Conditions",
        "Payments due within 15 days.",
      ],
      confidence: 0.8,
    });
    expect(result?.description).toBe("Front and rear brake cables, New set of pedal ams, Labor 3hrs");
    expect(result?.description).not.toMatch(/subtotal|sales tax|terms|payment/i);
  });

  it("keeps only the description column from a full invoice table row", () => {
    const text = `
      LuLu TRADING
      BillNo 28147
      Date 01/09/2026
      SN DESCRIPTION QTY UNIT UNIT PRICE AMOUNT
      1 TILE GLUE SALINA 20 KG 20 PCS 14.50 290.00
      2 TILE LEVELING SPACER 1MM 4 PKT 10.00 40.00
      Grand Total 330.00
    `;
    const result = parseInvoiceText(text);
    expect(result?.description).toBe("TILE GLUE SALINA 20 KG, TILE LEVELING SPACER 1MM");
    expect(result?.description).not.toMatch(/14\.50|290|PCS|PKT|40\.00|20 PCS|4 PKT/i);
  });

  it("strips qty, unit, and prices from messy OCR table dumps", () => {
    const result = invoiceExtractSchemaShape({
      date: "2026-09-01",
      amount: "330.00",
      description:
        "TLE GLUETATINE 20 BG 20 DCS 14. ر.ق, TILE LEVELING SPACER 1MM 4 PET 10.0p 40.00 &",
      type: "WITHDRAWAL",
      category: "materials",
      vendor: "LuLu TRADING",
      invoiceNumber: "28147",
      items: [
        "TLE GLUETATINE 20 BG 20 DCS 14. ر.ق",
        "TILE LEVELING SPACER 1MM 4 PET 10.0p 40.00 &",
      ],
      confidence: 0.8,
    });
    expect(result?.description).toBe("TILE LEVELING SPACER 1MM");
    expect(result?.description).not.toMatch(/GLUETATINE|DCS|PET|14\.|40\.00|ر\.?\s*ق|&|BG/i);
  });

  it("leaves description empty when item text is unreadable", () => {
    const result = invoiceExtractSchemaShape({
      date: "2026-09-01",
      amount: "330.00",
      description: "TLE GLUETATINE 20 BG 20 DCS 14. ر.ق",
      type: "WITHDRAWAL",
      category: "materials",
      vendor: "LuLu TRADING",
      invoiceNumber: "28147",
      items: ["TLE GLUETATINE 20 BG 20 DCS 14. ر.ق", "T0RG SAUNA 7"],
      confidence: 0.8,
    });
    expect(result?.description).toBe("");
    expect(result?.amount).toBe("330.00");
    expect(result?.notes).toContain("Vendor: LuLu TRADING");
    expect(result?.notes).toContain("Invoice #28147");
    expect(result?.notes).not.toMatch(/Items:|GLUETATINE|T0RG/);
  });
});
