import { isValid, parse } from "date-fns";
import { fromDateInputValue, toDateInputValue } from "@/lib/formatting/date";

export const BANK_CODES = ["QIB", "AAHLI", "QIIB", "CBQ", "MASRAF"] as const;
export type BankCode = (typeof BANK_CODES)[number];

export type StatementField =
  | "date"
  | "accountNumber"
  | "description"
  | "reference"
  | "debit"
  | "credit"
  | "balance";

export type BankColumn = {
  label: string;
  value: string;
  field: StatementField;
};

export type ParsedStatementRow = {
  date: string;
  accountNumber: string;
  desc: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number | null;
};

type ColumnMap = Partial<Record<StatementField, number>>;

export const BANK_COLUMNS: Record<BankCode, BankColumn[]> = {
  QIB: [
    { label: "A", value: "Date", field: "date" },
    { label: "B", value: "AccountNumber", field: "accountNumber" },
    { label: "C", value: "Description", field: "description" },
    { label: "D", value: "Reference", field: "reference" },
    { label: "E", value: "Debit", field: "debit" },
    { label: "F", value: "Credit", field: "credit" },
    { label: "G", value: "Balance", field: "balance" },
  ],
  AAHLI: [
    { label: "A", value: "Date", field: "date" },
    { label: "B", value: "Description", field: "description" },
    { label: "C", value: "Withdrawn", field: "debit" },
    { label: "D", value: "Deposited", field: "credit" },
    { label: "E", value: "Balance", field: "balance" },
  ],
  QIIB: [
    { label: "A", value: "Date", field: "date" },
    { label: "B", value: "Description", field: "description" },
    { label: "C", value: "Debit", field: "debit" },
    { label: "D", value: "Credit", field: "credit" },
    { label: "E", value: "Balance", field: "balance" },
  ],
  CBQ: [
    { label: "A", value: "Date", field: "date" },
    { label: "B", value: "Value date", field: "date" },
    { label: "C", value: "Description", field: "description" },
    { label: "D", value: "Out", field: "debit" },
    { label: "E", value: "In", field: "credit" },
  ],
  MASRAF: [
    { label: "A", value: "Date", field: "date" },
    { label: "B", value: "Description", field: "description" },
    { label: "C", value: "Ref", field: "reference" },
    { label: "D", value: "Debit", field: "debit" },
    { label: "E", value: "Credit", field: "credit" },
  ],
};

const POSITIONAL: Record<BankCode, ColumnMap> = {
  QIB: {
    date: 0,
    accountNumber: 1,
    description: 2,
    reference: 3,
    debit: 4,
    credit: 5,
    balance: 6,
  },
  AAHLI: { date: 0, description: 1, debit: 2, credit: 3, balance: 4 },
  QIIB: { date: 0, description: 1, debit: 2, credit: 3, balance: 4 },
  CBQ: { date: 0, description: 2, debit: 3, credit: 4 },
  MASRAF: { date: 0, description: 1, reference: 2, debit: 3, credit: 4 },
};

const TEMPLATE_SAMPLES: Record<BankCode, string> = {
  QIB: [
    "01/07/2026,00123456789,Incoming transfer,REF-001,,10000,50000",
    "02/07/2026,00123456789,Salaries,REF-002,16500,,33500",
  ].join("\n"),
  AAHLI: [
    "01/07/2026,Incoming transfer,,10000,50000",
    "02/07/2026,Salaries,16500,,33500",
  ].join("\n"),
  QIIB: [
    "01/07/2026,Incoming transfer,,10000,50000",
    "02/07/2026,Salaries,16500,,33500",
  ].join("\n"),
  CBQ: [
    "01/07/2026,01/07/2026,Incoming transfer,,10000",
    "02/07/2026,02/07/2026,Salaries,16500,",
  ].join("\n"),
  MASRAF: [
    "01/07/2026,Incoming transfer,REF-001,,10000",
    "02/07/2026,Salaries,REF-002,16500,",
  ].join("\n"),
};

const HEADER_ALIASES: Record<string, StatementField | "valueDate"> = {
  date: "date",
  transactiondate: "date",
  txndate: "date",
  transdate: "date",
  postingdate: "date",
  تاريخ: "date",
  valuedate: "valueDate",
  accountnumber: "accountNumber",
  accountno: "accountNumber",
  account: "accountNumber",
  acct: "accountNumber",
  acctno: "accountNumber",
  accno: "accountNumber",
  رقمالحساب: "accountNumber",
  description: "description",
  narration: "description",
  particulars: "description",
  details: "description",
  transactiondetails: "description",
  البيان: "description",
  الوصف: "description",
  reference: "reference",
  ref: "reference",
  refno: "reference",
  referenceno: "reference",
  referencenumber: "reference",
  رقمالمرجع: "reference",
  المرجع: "reference",
  debit: "debit",
  withdrawn: "debit",
  withdrawal: "debit",
  withdrawals: "debit",
  out: "debit",
  مدين: "debit",
  credit: "credit",
  deposited: "credit",
  deposit: "credit",
  deposits: "credit",
  in: "credit",
  دائن: "credit",
  balance: "balance",
  runningbalance: "balance",
  closingbalance: "balance",
  رصيد: "balance",
};

const NAMED_DATE_FORMATS = [
  "dd-MMM-yyyy",
  "d-MMM-yyyy",
  "dd MMM yyyy",
  "d MMM yyyy",
  "dd-MMM-yy",
  "d-MMM-yy",
];

export function isBankCode(value: string): value is BankCode {
  return (BANK_CODES as readonly string[]).includes(value);
}

export function statementTemplateCsv(bank: BankCode): string {
  const header = BANK_COLUMNS[bank].map((col) => col.value).join(",");
  return `${header}\n${TEMPLATE_SAMPLES[bank]}`;
}

export function parseStatementCsv(text: string, bank: BankCode): ParsedStatementRow[] {
  const rows = splitCsv(text.replace(/^\uFEFF/, "")).filter((row) =>
    row.some((cell) => String(cell).trim() !== ""),
  );
  return parseStatementRows(rows, bank);
}

export function parseStatementRows(rows: unknown[][], bank: BankCode): ParsedStatementRow[] {
  if (rows.length === 0) return [];

  const detected = detectColumns(rows);
  const map = detected ?? POSITIONAL[bank];
  const start = detected ? detectedStart(rows, map) : 0;
  const parsed: ParsedStatementRow[] = [];

  for (const row of rows.slice(start)) {
    const date = formatCellDate(cellAt(row, map.date));
    const desc = cellText(cellAt(row, map.description));
    const accountNumber = cellText(cellAt(row, map.accountNumber));
    const reference = cellText(cellAt(row, map.reference));
    if (isHeaderLike(date) || isHeaderLike(desc)) continue;
    if (!date && !desc) continue;
    if (!parseStatementDate(date)) continue;

    const debit = parseAmount(cellAt(row, map.debit));
    const credit = parseAmount(cellAt(row, map.credit));
    if (!debit && !credit) continue;
    if (!desc && !reference) continue;

    parsed.push({
      date,
      accountNumber,
      desc: desc || reference || "Bank transaction",
      reference,
      debit,
      credit,
      balance: parseOptionalAmount(cellAt(row, map.balance)),
    });
  }

  return parsed;
}

export function parseStatementDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return fromDateInputValue(`${iso[1]}-${iso[2]}-${iso[3]}`);
  }

  const dmy = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) {
    return fromDateInputValue(
      `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`,
    );
  }

  const dmyShort = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})$/);
  if (dmyShort) {
    const yy = Number(dmyShort[3]);
    const year = yy >= 70 ? 1900 + yy : 2000 + yy;
    return fromDateInputValue(
      `${year}-${dmyShort[2].padStart(2, "0")}-${dmyShort[1].padStart(2, "0")}`,
    );
  }

  if (/^\d{5}(\.\d+)?$/.test(trimmed)) {
    const serial = Number(trimmed);
    if (serial >= 20000 && serial <= 80000) {
      return fromExcelSerial(serial);
    }
  }

  for (const format of NAMED_DATE_FORMATS) {
    const parsed = parse(trimmed, format, new Date());
    if (isValid(parsed)) {
      return fromDateInputValue(
        `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`,
      );
    }
  }

  return null;
}

export function toIsoDate(value: string): string | null {
  const date = parseStatementDate(value);
  return date ? toDateInputValue(date) : null;
}

export function importDescription(row: ParsedStatementRow): string {
  const parts = [row.desc];
  if (row.reference && !row.desc.includes(row.reference)) {
    parts.push(row.reference);
  }
  return parts.join(" · ").slice(0, 240);
}

export function closingBalance(rows: ParsedStatementRow[]): number | null {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i]?.balance != null) return rows[i]!.balance;
  }
  return null;
}

function detectColumns(
  rows: unknown[][],
): ColumnMap | null {
  const limit = Math.min(rows.length, 25);
  for (let i = 0; i < limit; i += 1) {
    const map = mapHeaderRow(rows[i] ?? []);
    if (map.date != null && (map.debit != null || map.credit != null)) {
      return map;
    }
  }
  return null;
}

function detectedStart(rows: unknown[][], map: ColumnMap): number {
  const limit = Math.min(rows.length, 25);
  for (let i = 0; i < limit; i += 1) {
    const date = cellText(cellAt(rows[i] ?? [], map.date));
    if (isHeaderLike(date)) return i + 1;
  }
  return 0;
}

function mapHeaderRow(row: unknown[]): ColumnMap {
  const map: ColumnMap = {};
  let valueDate: number | undefined;
  row.forEach((cell, index) => {
    const key = normalizeHeader(cellText(cell));
    if (!key) return;
    const field = HEADER_ALIASES[key];
    if (!field) return;
    if (field === "valueDate") {
      valueDate = index;
      return;
    }
    if (map[field] == null) map[field] = index;
  });
  if (map.date == null && valueDate != null) {
    map.date = valueDate;
  }
  return map;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[\s_\-/().]/g, "");
}

function isHeaderLike(value: string): boolean {
  const key = normalizeHeader(value);
  return key === "date" || key in HEADER_ALIASES;
}

function cellAt(row: unknown[], index: number | undefined): unknown {
  if (index == null) return "";
  return row[index];
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return formatCellDate(value);
  return String(value).trim();
}

function formatCellDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const utcMidnight = value.getUTCHours() === 0 && value.getUTCMinutes() === 0;
    const year = utcMidnight ? value.getUTCFullYear() : value.getFullYear();
    const month = (utcMidnight ? value.getUTCMonth() : value.getMonth()) + 1;
    const day = utcMidnight ? value.getUTCDate() : value.getDate();
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  }
  if (typeof value === "number" && value >= 20000 && value <= 80000) {
    return formatUtcDate(fromExcelSerial(value));
  }
  return cellText(value);
}

function fromExcelSerial(serial: number): Date {
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  return new Date(utc);
}

function formatUtcDate(date: Date): string {
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function parseAmount(value: unknown): number {
  const amount = parseOptionalAmount(value);
  return amount ?? 0;
}

function parseOptionalAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.abs(value) : null;
  }
  const raw = String(value).trim();
  if (!raw || raw === "-" || raw === "—" || raw === "–") return null;
  const paren = /^\((.*)\)$/.exec(raw);
  const text = (paren?.[1] ?? raw).replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (!text) return null;
  const amount = Number(text);
  return Number.isFinite(amount) ? Math.abs(amount) : null;
}

function splitCsv(text: string): string[][] {
  return text.split(/\r?\n/).map(parseCsvLine);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}
