import {
  TRANSACTION_CATEGORIES,
  categoriesForType,
  type TransactionCategory,
} from "./categories";

export type InvoiceExtract = {
  date: string;
  amount: string;
  description: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  category: TransactionCategory;
  notes: string;
  vendor: string;
  invoiceNumber: string;
  confidence: number;
};

const DATE_PATTERNS = [
  /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/,
  /\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/,
];

const AMOUNT_TOKEN = "([0-9]{1,3}(?:,[0-9]{3})+(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)";

const AMOUNT_PATTERNS = [
  new RegExp(`(?:QAR|QR|ر\\.?\\s*ق\\.?|Riyal)\\s*[:#]?\\s*${AMOUNT_TOKEN}`, "i"),
  new RegExp(
    `(?:total|amount|grand\\s*total|net\\s*(?:amount|total)|المبلغ|الإجمالي|المجموع)\\s*[:#]?\\s*(?:QAR|QR|ر\\.?\\s*ق\\.?)?\\s*${AMOUNT_TOKEN}`,
    "i",
  ),
  new RegExp(`${AMOUNT_TOKEN}\\s*(?:QAR|QR|ر\\.?\\s*ق\\.?)`, "i"),
];

const INVOICE_NO_PATTERNS = [
  /(?:invoice|inv|فاتورة|رقم(?:\s*الفاتورة)?)\s*(?:no\.?|number|#|رقم)?\s*[:#]?\s*([A-Z0-9][-A-Z0-9/]{2,})/i,
];

const CATEGORY_HINTS: Array<{ category: TransactionCategory; pattern: RegExp }> = [
  { category: "rent", pattern: /\b(rent|إيجار|ايجار)\b/i },
  { category: "salaries", pattern: /\b(salary|salaries|payroll|راتب|رواتب)\b/i },
  { category: "materials", pattern: /\b(material|cement|steel|paint|مواد|أسمنت|حديد)\b/i },
  { category: "labor", pattern: /\b(labor|labour|wages|عمالة|أجور)\b/i },
  { category: "equipment", pattern: /\b(equipment|machinery|معدات|آليات)\b/i },
  { category: "transportation", pattern: /\b(transport|freight|shipping|نقل|شحن)\b/i },
  { category: "vehicles", pattern: /\b(fuel|petrol|diesel|vehicle|وقود|بنزين|سيارة)\b/i },
  { category: "electricity", pattern: /\b(electric|kahramaa|كهرباء|كهرماء)\b/i },
  { category: "internet", pattern: /\b(internet|ooredoo|vodafone|إنترنت)\b/i },
  { category: "marketing", pattern: /\b(marketing|advertis|تسويق|إعلان)\b/i },
  { category: "subcontractors", pattern: /\b(subcontractor|مقاول)\b/i },
  { category: "project_payment", pattern: /\b(payment received|client payment|دفعة مشروع|تحصيل)\b/i },
];

function pad(value: string) {
  return value.padStart(2, "0");
}

function normalizeDate(year: string, month: string, day: string) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(String(m))}-${pad(String(d))}`;
}

function extractDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    if (match[1].length === 4) {
      return normalizeDate(match[1], match[2], match[3]);
    }
    const first = Number(match[1]);
    if (first > 12) {
      return normalizeDate(match[3], match[2], match[1]);
    }
    return normalizeDate(match[3], match[2], match[1]);
  }
  return null;
}

function extractAmount(text: string): string | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value > 0) {
      return value.toFixed(2);
    }
  }
  const numbers = [...text.matchAll(/\b([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+\.[0-9]{2})\b/g)]
    .map((item) => Number(item[1].replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value >= 1);
  if (numbers.length === 0) return null;
  return Math.max(...numbers).toFixed(2);
}

function extractInvoiceNumber(text: string): string {
  for (const pattern of INVOICE_NO_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function guessVendor(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 3 && !/^(invoice|فاتورة|tax|total|date|التاريخ)/i.test(line));
  return (lines[0] ?? "").slice(0, 80);
}

function guessCategory(text: string, type: "DEPOSIT" | "WITHDRAWAL"): TransactionCategory {
  for (const hint of CATEGORY_HINTS) {
    if (hint.pattern.test(text) && categoriesForType(type).includes(hint.category)) {
      return hint.category;
    }
  }
  return categoriesForType(type)[0];
}

function todayIso() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${pad(String(now.getUTCMonth() + 1))}-${pad(String(now.getUTCDate()))}`;
}

export function parseInvoiceText(text: string): InvoiceExtract | null {
  const cleaned = text.replace(/\u00a0/g, " ").trim();
  if (cleaned.length < 8) return null;

  const isDeposit = /\b(payment received|amount received|credit note|تحصيل|دفعة مستلمة)\b/i.test(cleaned);
  const type: "DEPOSIT" | "WITHDRAWAL" = isDeposit ? "DEPOSIT" : "WITHDRAWAL";
  const amount = extractAmount(cleaned);
  if (!amount) return null;

  const date = extractDate(cleaned) ?? todayIso();
  const invoiceNumber = extractInvoiceNumber(cleaned);
  const vendor = guessVendor(cleaned);
  const category = guessCategory(cleaned, type);
  const description = vendor
    ? `${vendor}${invoiceNumber ? ` · ${invoiceNumber}` : ""}`
    : invoiceNumber
      ? `Invoice ${invoiceNumber}`
      : "Invoice";
  const notes = [vendor && `Vendor: ${vendor}`, invoiceNumber && `Invoice #${invoiceNumber}`]
    .filter(Boolean)
    .join("\n");

  let confidence = 0.45;
  if (extractDate(cleaned)) confidence += 0.2;
  if (invoiceNumber) confidence += 0.15;
  if (vendor) confidence += 0.1;
  if (AMOUNT_PATTERNS.some((pattern) => pattern.test(cleaned))) confidence += 0.1;

  return {
    date,
    amount,
    description: description.slice(0, 240),
    type,
    category,
    notes: notes.slice(0, 2000),
    vendor,
    invoiceNumber,
    confidence: Math.min(confidence, 0.95),
  };
}

export function invoiceExtractSchemaShape(value: unknown): InvoiceExtract | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const amount = String(row.amount ?? "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) return null;
  const type = row.type === "DEPOSIT" ? "DEPOSIT" : "WITHDRAWAL";
  const categoryRaw = String(row.category ?? "");
  const category = (TRANSACTION_CATEGORIES as readonly string[]).includes(categoryRaw)
    ? (categoryRaw as TransactionCategory)
    : categoriesForType(type)[0];
  const date = String(row.date ?? "");
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayIso(),
    amount: Number(amount).toFixed(2),
    description: String(row.description ?? "Invoice").slice(0, 240),
    type,
    category,
    notes: String(row.notes ?? "").slice(0, 2000),
    vendor: String(row.vendor ?? "").slice(0, 80),
    invoiceNumber: String(row.invoiceNumber ?? "").slice(0, 40),
    confidence: Math.min(1, Math.max(0, Number(row.confidence ?? 0.7))),
  };
}
