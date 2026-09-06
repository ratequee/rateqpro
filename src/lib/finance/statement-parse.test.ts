import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  closingBalance,
  importDescription,
  parseStatementCsv,
  parseStatementDate,
  parseStatementPdfText,
  parseStatementRows,
  statementTemplateCsv,
  toIsoDate,
} from "./statement-parse";

const QIB_CSV = [
  "Date,AccountNumber,Description,Reference,Debit,Credit,Balance",
  "01/07/2026,00123456789,Incoming transfer,REF-001,,10000,50000",
  "02/07/2026,00123456789,Salaries,REF-002,16500,,33500",
].join("\n");

describe("QIB statement parsing", () => {
  it("maps Date, AccountNumber, Description, Reference, Debit, Credit, Balance", () => {
    const rows = parseStatementCsv(QIB_CSV, "QIB");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      date: "01/07/2026",
      accountNumber: "00123456789",
      desc: "Incoming transfer",
      reference: "REF-001",
      debit: 0,
      credit: 10000,
      balance: 50000,
    });
    expect(rows[1]).toMatchObject({
      desc: "Salaries",
      debit: 16500,
      credit: 0,
      balance: 33500,
    });
  });

  it("skips title rows above the QIB header", () => {
    const csv = [
      "Qatar Islamic Bank",
      "Statement of Account",
      "",
      "Date,AccountNumber,Description,Reference,Debit,Credit,Balance",
      "03/07/2026,00999,Office rent,INV-88,4200,,29000",
    ].join("\n");
    const rows = parseStatementCsv(csv, "QIB");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.desc).toBe("Office rent");
    expect(rows[0]?.reference).toBe("INV-88");
  });

  it("parses quoted descriptions and thousands separators", () => {
    const csv = [
      "Date,AccountNumber,Description,Reference,Debit,Credit,Balance",
      '04/07/2026,001,"Salary, June",PAY-1,"16,500.00",,"33,500.00"',
    ].join("\n");
    const rows = parseStatementCsv(csv, "QIB");
    expect(rows[0]?.desc).toBe("Salary, June");
    expect(rows[0]?.debit).toBe(16500);
    expect(rows[0]?.balance).toBe(33500);
  });

  it("falls back to QIB column positions when there is no header", () => {
    const csv = "05/07/2026,00123456789,Vendor payment,TRX-9,800,,";
    const rows = parseStatementCsv(csv, "QIB");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      desc: "Vendor payment",
      reference: "TRX-9",
      debit: 800,
    });
  });

  it("reads a QIB xlsx workbook", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Date", "AccountNumber", "Description", "Reference", "Debit", "Credit", "Balance"],
      ["01/07/2026", "00123456789", "Incoming transfer", "REF-001", "", 10000, 50000],
      ["02/07/2026", "00123456789", "Salaries", "REF-002", 16500, "", 33500],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Statement");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const parsed = XLSX.read(buffer, { type: "array", cellDates: true });
    const firstSheet = parsed.Sheets[parsed.SheetNames[0] ?? ""];
    const cells = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(firstSheet!, {
      header: 1,
      raw: true,
      defval: "",
      blankrows: false,
    });
    const rows = parseStatementRows(cells, "QIB");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.credit).toBe(10000);
    expect(rows[1]?.debit).toBe(16500);
    expect(closingBalance(rows)).toBe(33500);
  });
});

describe("statement helpers", () => {
  it("builds the QIB template with the seven bank columns", () => {
    const csv = statementTemplateCsv("QIB");
    expect(csv.split("\n")[0]).toBe(
      "Date,AccountNumber,Description,Reference,Debit,Credit,Balance",
    );
  });

  it("parses Qatar dates and named months", () => {
    expect(toIsoDate("01/07/2026")).toBe("2026-07-01");
    expect(toIsoDate("1-Jul-2026")).toBe("2026-07-01");
    expect(parseStatementDate("2026-07-01")?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("keeps the bank reference in the imported description", () => {
    expect(
      importDescription({
        date: "01/07/2026",
        accountNumber: "001",
        desc: "Incoming transfer",
        reference: "REF-001",
        debit: 0,
        credit: 10000,
        balance: 50000,
      }),
    ).toBe("Incoming transfer · REF-001");
  });

  it("reads QIB-style PDF text with debit, credit, and balance", () => {
    const text = `
      Qatar Islamic Bank
      Statement of Account
      Date AccountNumber Description Reference Debit Credit Balance
      01/07/2026 00123456789 Incoming transfer REF-001  10,000.00 50,000.00
      02/07/2026 00123456789 Salaries REF-002 16,500.00  33,500.00
    `;
    const rows = parseStatementPdfText(text, "QIB");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ credit: 10000, debit: 0, balance: 50000 });
    expect(rows[1]).toMatchObject({ debit: 16500, credit: 0, balance: 33500 });
  });

  it("reads loose PDF lines with CR/DR markers", () => {
    const text = `
      03/07/2026 Client receipt INV-22 8,000.00 CR 41,500.00
      04/07/2026 Vendor payment BILL-9 1,250.00 DR 40,250.00
    `;
    const rows = parseStatementPdfText(text, "QIB");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ credit: 8000, debit: 0, balance: 41500, reference: "INV-22" });
    expect(rows[1]).toMatchObject({ debit: 1250, credit: 0, balance: 40250 });
  });

  it("reassembles columnar PDF text and splits multiple dates on one line", () => {
    const columnar = `
      01/07/2026
      Incoming transfer
      REF-001
      10,000.00
      50,000.00
      02/07/2026
      Salaries
      16,500.00
      33,500.00
    `;
    const columnarRows = parseStatementPdfText(columnar, "QIB");
    expect(columnarRows[0]).toMatchObject({ credit: 10000, debit: 0, balance: 50000 });
    expect(columnarRows[1]).toMatchObject({ debit: 16500, credit: 0, balance: 33500 });

    const packed =
      "01/07/2026 Incoming transfer 10,000.00 50,000.00 02/07/2026 Salaries 16,500.00 33,500.00";
    const packedRows = parseStatementPdfText(packed, "QIB");
    expect(packedRows).toHaveLength(2);
    expect(packedRows[0]?.credit).toBe(10000);
    expect(packedRows[1]?.debit).toBe(16500);
  });

  it("still parses Al Ahli withdrawn/deposited columns", () => {
    const csv = [
      "Date,Description,Withdrawn,Deposited,Balance",
      "01/07/2026,Incoming transfer,,2500,12000",
    ].join("\n");
    const rows = parseStatementCsv(csv, "AAHLI");
    expect(rows[0]).toMatchObject({ credit: 2500, debit: 0, balance: 12000 });
  });
});
