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
  items?: string[];
};

const LABELED_DATE_PATTERNS = [
  /(?:invoice\s*)?date\s*[:.\-–]?\s*(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/i,
  /(?:invoice\s*)?date\s*[:.\-–]?\s*(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/i,
  /التاريخ\s*[:.\-–]?\s*(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/,
  /(?:invoice\s*)?date\s*[:.\-–]?\s*[\r\n]+\s*(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/i,
];

const UNLABELED_DATE_PATTERNS = [
  /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/,
  /\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/,
  /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})\b/,
];

const AMOUNT_TOKEN = "([0-9]{1,3}(?:,[0-9]{3})+(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)";

const AMOUNT_PATTERNS = [
  new RegExp(
    `(?:grand\\s*total|net\\s*(?:amount|total)|الإجمالي|المجموع)\s*[:#]?\\s*(?:QAR|QR|ر\\.?\\s*ق\\.?)?\\s*${AMOUNT_TOKEN}`,
    "i",
  ),
  new RegExp(`(?:total|amount|المبلغ)\\s*[:#]?\\s*(?:QAR|QR|ر\\.?\\s*ق\\.?)?\\s*${AMOUNT_TOKEN}`, "i"),
  new RegExp(`(?:QAR|QR|ر\\.?\\s*ق\\.?|Riyal)\\s*[:#]?\\s*${AMOUNT_TOKEN}`, "i"),
  new RegExp(`${AMOUNT_TOKEN}\\s*(?:QAR|QR|ر\\.?\\s*ق\\.?)`, "i"),
];

const INVOICE_NO_PATTERNS = [
  /(?:bill\s*no\.?|billno|bill\s*#)\s*[:.\-–]?\s*([A-Z]{0,8}-?\d{3,})/i,
  /(?:invoice\s*(?:no\.?|number|#)|inv(?:oice)?\s*(?:no\.?|#)?)\s*[:.\-–]?\s*([A-Z]{0,8}-?\d{3,})/i,
  /(?:فاتورة|رقم(?:\s*الفاتورة)?)\s*[:.\-–]?\s*(\d{3,})/,
];

const RESERVED_INVOICE_TOKENS = /^(date|total|page|invoice|bill|qty|amount|description)$/i;

const CATEGORY_HINTS: Array<{ category: TransactionCategory; pattern: RegExp }> = [
  { category: "rent", pattern: /\b(rent|إيجار|ايجار)\b/i },
  { category: "salaries", pattern: /\b(salary|salaries|payroll|راتب|رواتب)\b/i },
  { category: "materials", pattern: /\b(material|cement|steel|paint|tile|glue|plumbing|أسمنت|حديد|مواد|بلاط|دهان)\b/i },
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

function expandYear(year: string) {
  if (year.length === 4) return year;
  const yy = Number(year);
  return String(yy >= 70 ? 1900 + yy : 2000 + yy);
}

function normalizeDate(year: string, month: string, day: string) {
  const y = Number(expandYear(year));
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(String(m))}-${pad(String(d))}`;
}

function dateFromMatch(match: RegExpMatchArray, dmy: boolean) {
  if (match[1]?.length === 4) {
    return normalizeDate(match[1], match[2], match[3]);
  }
  if (dmy) {
    return normalizeDate(match[3], match[2], match[1]);
  }
  const first = Number(match[1]);
  if (first > 12) {
    return normalizeDate(match[3], match[2], match[1]);
  }
  return normalizeDate(match[3], match[2], match[1]);
}

function extractDate(text: string): string | null {
  for (const pattern of LABELED_DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    const parsed = dateFromMatch(match, match[1].length !== 4);
    if (parsed) return parsed;
  }
  for (const pattern of UNLABELED_DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    const parsed = dateFromMatch(match, true);
    if (parsed) return parsed;
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
    .filter((value) => Number.isFinite(value) && value >= 1 && value < 10_000_000);
  if (numbers.length === 0) return null;
  return Math.max(...numbers).toFixed(2);
}

function extractInvoiceNumber(text: string): string {
  for (const pattern of INVOICE_NO_PATTERNS) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim() ?? "";
    if (value && /\d/.test(value) && !RESERVED_INVOICE_TOKENS.test(value)) {
      return value;
    }
  }
  return "";
}

function cleanOcrLine(line: string): string {
  return line
    .replace(/[©®™]+/g, " ")
    .replace(/[\[\]{}<>]+/g, " ")
    .replace(/\bTRAD\s*I?\s*NG\b/i, "TRADING")
    .replace(/\bLu\s*Lu\b/gi, "LuLu")
    .replace(/\b6\s+Lu\b/gi, "LuLu")
    .replace(/\bnn\b/gi, " ")
    .replace(/[^\p{L}\p{N}\s.,&'()/-]/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isNoiseLine(line: string): boolean {
  if (line.length < 3) return true;
  const letters = (line.match(/\p{L}/gu) ?? []).length;
  if (letters < 3) return true;
  if (
    /^(invoice|فاتورة|tax|total|date|التاريخ|page|qty|description|amount|unit|sn\.?|bill\s*no|customer|thank you)/i.test(
      line,
    )
  ) {
    return true;
  }
  if (/shop\s*no|building\s*no|souq|doha|qatar|page\s*\d|mob(?:ile)?\s*:/i.test(line)) {
    return true;
  }
  return false;
}

function guessVendor(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => cleanOcrLine(line))
    .filter((line) => line && !isNoiseLine(line));
  const named = lines.find((line) =>
    /trading|llc|w\.?\s*l\.?\s*l|lulu|لولو|شركة|مؤسسة|building materials/i.test(line),
  );
  const vendor = named ?? lines[0] ?? "";
  return vendor.slice(0, 80);
}

function guessLineItems(text: string): string[] {
  const items: string[] = [];
  let inTable = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = cleanOcrLine(raw);
    if (/description/i.test(line) && /qty|unit|amount|الوصف/i.test(line)) {
      inTable = true;
      continue;
    }
    if (!line || /grand\s*total|net\s*total|discount|thank you/i.test(line)) {
      if (/total/i.test(line)) inTable = false;
      continue;
    }
    const numbered = line.match(
      /^\d{1,3}\s+(.+?)\s+\d+(?:\.\d+)?\s+(?:PCS|PKT|KG|BOX|M|LTR|NOS?|PKT)\b/i,
    );
    if (numbered?.[1] && !/trading|international|customer|invoice/i.test(numbered[1])) {
      items.push(numbered[1].replace(/\s+/g, " ").trim());
      continue;
    }
    if (inTable && line.length >= 8 && !isNoiseLine(line) && !/trading|international/i.test(line)) {
      const name = line.replace(/\s+\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?){1,3}\s*$/, "").trim();
      if (name.length >= 8) items.push(name);
    }
  }
  return [...new Set(items)].slice(0, 4);
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

function shortVendor(vendor: string): string {
  const english = vendor
    .replace(/[\u0600-\u06FF].*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return (english || vendor).slice(0, 60);
}

function looksLikeVendorDescription(description: string, vendor: string): boolean {
  const d = description.toLowerCase().replace(/\s+/g, " ").trim();
  const v = vendor.toLowerCase().replace(/\s+/g, " ").trim();
  if (!d) return true;
  if (v && (d === v || d.includes(v) || v.includes(d))) return true;
  return /lulu|trading|لولو|شركة|مؤسسة/.test(d) && !/\b(tile|glue|cement|steel|paint|spacer|rent|salary)\b/i.test(d);
}

function extractCustomer(text: string): string {
  const match = text.match(/(?:customer(?:\s*name)?|client)\s*[:.\-–]?\s*([A-Z][A-Z0-9 &.'-]{3,})/i);
  const value = cleanOcrLine(match?.[1] ?? "");
  if (!value || /invoice|date|bill/i.test(value)) return "";
  return value.slice(0, 80);
}

function buildDescription(vendor: string, invoiceNumber: string, items: string[]) {
  if (items.length > 0) return items.join(", ").slice(0, 240);
  if (vendor && invoiceNumber) return `${shortVendor(vendor)} · ${invoiceNumber}`.slice(0, 240);
  if (vendor) return shortVendor(vendor);
  if (invoiceNumber) return `Invoice ${invoiceNumber}`;
  return "Invoice";
}

function buildNotes(input: {
  vendor: string;
  invoiceNumber: string;
  items: string[];
  customer?: string;
}) {
  return [
    input.vendor && `Vendor: ${shortVendor(input.vendor)}`,
    input.invoiceNumber && `Invoice #${input.invoiceNumber}`,
    input.customer && `Customer: ${input.customer}`,
    input.items.length > 0 ? `Items: ${input.items.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
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
  const items = guessLineItems(cleaned);
  const customer = extractCustomer(cleaned);
  const category = guessCategory(`${cleaned} ${items.join(" ")}`, type);
  const description = buildDescription(vendor, invoiceNumber, items);
  const notes = buildNotes({ vendor, invoiceNumber, items, customer });

  let confidence = 0.45;
  if (extractDate(cleaned)) confidence += 0.2;
  if (invoiceNumber) confidence += 0.15;
  if (vendor) confidence += 0.1;
  if (AMOUNT_PATTERNS.some((pattern) => pattern.test(cleaned))) confidence += 0.1;

  return {
    date,
    amount,
    description,
    type,
    category,
    notes: notes.slice(0, 2000),
    vendor: shortVendor(vendor),
    invoiceNumber,
    confidence: Math.min(confidence, 0.95),
    items,
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
  const dateRaw = String(row.date ?? "");
  const date = extractDate(dateRaw) ?? (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : todayIso());
  const invoiceNumberRaw = String(row.invoiceNumber ?? "").trim();
  const invoiceNumber =
    invoiceNumberRaw && /\d/.test(invoiceNumberRaw) && !RESERVED_INVOICE_TOKENS.test(invoiceNumberRaw)
      ? invoiceNumberRaw.slice(0, 40)
      : "";
  const vendor = shortVendor(cleanOcrLine(String(row.vendor ?? "")));
  const items = Array.isArray(row.items)
    ? row.items.map((item) => cleanOcrLine(String(item))).filter((item) => item.length >= 4).slice(0, 6)
    : [];
  const descriptionRaw = cleanOcrLine(String(row.description ?? ""));
  const description = buildDescription(vendor, invoiceNumber, items.length > 0 ? items : []);
  const finalDescription =
    items.length > 0
      ? description
      : looksLikeVendorDescription(descriptionRaw, vendor)
        ? buildDescription(vendor, invoiceNumber, [])
        : descriptionRaw.slice(0, 240) || description;
  return {
    date,
    amount: Number(amount).toFixed(2),
    description: finalDescription,
    type,
    category,
    notes: buildNotes({ vendor, invoiceNumber, items }).slice(0, 2000),
    vendor,
    invoiceNumber,
    confidence: Math.min(1, Math.max(0, Number(row.confidence ?? 0.7))),
    items,
  };
}

export function mergeInvoiceExtracts(
  primary: InvoiceExtract | null,
  secondary: InvoiceExtract | null,
): InvoiceExtract | null {
  if (!primary) return secondary;
  if (!secondary) return primary;
  const items =
    (primary.items?.length ?? 0) > 0
      ? primary.items ?? []
      : secondary.items ?? [];
  const vendor = shortVendor(primary.vendor || secondary.vendor);
  const invoiceNumber = primary.invoiceNumber || secondary.invoiceNumber;
  const description = !looksLikeVendorDescription(secondary.description, vendor)
    ? secondary.description
    : !looksLikeVendorDescription(primary.description, vendor)
      ? primary.description
      : buildDescription(vendor, invoiceNumber, items);
  return {
    date: primary.date || secondary.date,
    amount: primary.amount || secondary.amount,
    description,
    type: primary.type,
    category: primary.category === categoriesForType(primary.type)[0] ? secondary.category : primary.category,
    notes: buildNotes({
      vendor,
      invoiceNumber,
      items: items.length > 0 ? items : description && !looksLikeVendorDescription(description, vendor) ? [description] : [],
      customer: extractCustomer(`${secondary.notes}\n${primary.notes}`),
    }).slice(0, 2000),
    vendor,
    invoiceNumber,
    confidence: Math.max(primary.confidence, secondary.confidence),
    items,
  };
}
