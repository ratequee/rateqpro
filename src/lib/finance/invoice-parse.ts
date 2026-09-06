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
const DECIMAL_AMOUNT = "([0-9]{1,3}(?:,[0-9]{3})+\\.[0-9]{2}|[0-9]+\\.[0-9]{2})";
const CURRENCY = "(?:\\$|QAR|QR|ر\\.?\\s*ق\\.?|Riyal)";

const AMOUNT_PATTERNS = [
  new RegExp(
    `(?:grand\\s*total|net\\s*(?:amount|total)|الإجمالي|المجموع)\\s*[:#]?\\s*${CURRENCY}?\\s*${AMOUNT_TOKEN}`,
    "i",
  ),
  new RegExp(`(?:total|amount|المبلغ)\\s*[:#]?\\s*${CURRENCY}\\s*${AMOUNT_TOKEN}`, "i"),
  new RegExp(`(?:total|amount|المبلغ)\\s*[:#]?\\s*${DECIMAL_AMOUNT}`, "i"),
  new RegExp(`${CURRENCY}\\s*[:#]?\\s*${AMOUNT_TOKEN}`, "i"),
  new RegExp(`${AMOUNT_TOKEN}\\s*(?:QAR|QR|ر\\.?\\s*ق\\.?)`, "i"),
];

const INVOICE_NO_PATTERNS = [
  /(?:bill[o0]?|bill\s*no\.?|billno|bill\s*#)\s*[:.\-–]?\s*([A-Z]{0,8}-?\d{4,})/i,
  /(?:invoice\s*(?:no\.?|number|#)|inv(?:oice)?\s*(?:no\.?|#)?)\s*[:.\-–]?\s*([A-Z]{0,8}-?\d{3,})/i,
  /(?:فاتورة|رقم(?:\s*الفاتورة)?)\s*[:.\-–]?\s*(\d{4,})/,
];

const PRODUCT_HINT =
  /\b(tile|tle|glue|spacer|cement|steel|paint|pipe|cable|brake|pedal|labor|labour|switch|socket|grout|primer|plaster|salina|sauna|makita|jotun)\b/i;
const PRODUCT_SIZE = /\b\d+(?:\.\d+)?\s*(?:KG|MM|CM|M|LTR|PCS|PKT|PK|NOS?)\b/i;
const MONEY = "\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})";
const PACK_UNIT = "(?:PCS|PKT|BOX|NOS?|PK|DCS|PET|PRT|POS|PGS|PC)";
const DONT_SPLIT_AND = /^(stand|brand|grand|island|thousand|band|land|hand|sand|demand|command|understand)$/i;
const JUNK_ITEM =
  /^(subtotal|sales\s*tax|tax(?:es)?|vat|total|grand\s*total|net\s*total|balance(?:\s*due)?|terms?(?:\s*&\s*conditions?)?|conditions?|payment(?:s)?(?:\s+is)?(?:\s+due)?.*|due\s+within.*|please\s+make.*|checks?\s+payable.*|signature|thank\s+you.*|bill\s+to|ship\s+to|receipt(?:\s*#)?|qty|description|unit\s*price|amount|note|notes)$/i;

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
    /^(invoice|فاتورة|tax|sales\s*tax|subtotal|total|date|التاريخ|page|qty|description|amount|unit|sn\.?|bill\s*no|customer|thank you|terms|payment)/i.test(
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

function looksLikeJunkItem(line: string): boolean {
  const normalized = line.replace(/[:.%$]+/g, " ").replace(/\s+/g, " ").trim();
  if (JUNK_ITEM.test(normalized)) return true;
  return /terms\s*&\s*conditions|payment(?:s)?\s+due|make\s+checks?\s+payable|due\s+within\s+\d+/i.test(
    line,
  );
}

function unglueCommonWords(line: string): string {
  return line
    .replace(/([A-Za-z]{4,})(and|of|the)\b/g, (all, prefix: string, word: string) => {
      if (word.toLowerCase() === "and" && DONT_SPLIT_AND.test(`${prefix}${word}`)) return all;
      if (word.toLowerCase() === "of" && /^(of|proof|roof)$/i.test(`${prefix}${word}`)) return all;
      if (word.toLowerCase() === "the" && /^(the|lathe)$/i.test(`${prefix}${word}`)) return all;
      return `${prefix} ${word}`;
    })
    .replace(/\bnewset\b/gi, "New set")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toDescriptionColumn(line: string): string {
  return unglueCommonWords(
    cleanOcrLine(line)
      .replace(/^(?:sn|qty|description|item)\s*[:.\-–]?\s*/i, "")
      .replace(/^\d{1,3}\s+(?=[A-Za-z\u0600-\u06FF])/u, "")
      .replace(new RegExp(`\\s+\\d+(?:[.,]\\d+)?\\s+${PACK_UNIT}\\b.*$`, "i"), "")
      .replace(new RegExp(`(?:\\s+(?:QAR|QR|USD|\\$)?\\s*${MONEY})+$`, "i"), "")
      .replace(/\s+\d+[.,]\d{0,2}\s*ر\.?\s*ق\.?\s*$/i, "")
      .replace(/\s+ر\.?\s*ق\.?\s*$/i, "")
      .replace(/\s+\d+[.,]\d{1,2}[a-z]?(?:\s+\d+[.,]\d{2})?\s*[&]?\s*$/i, "")
      .replace(/\s+[&]+\s*$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
}

function sanitizeLineItems(items: string[]): string[] {
  const out: string[] = [];
  for (const raw of items) {
    for (const part of raw.split(/\s*,\s*/)) {
      const name = toDescriptionColumn(part);
      if (name.length < 4 || looksLikeJunkItem(name) || isNoiseLine(name)) continue;
      if (/trading|international|customer|invoice/i.test(name) && !PRODUCT_HINT.test(name)) continue;
      if (/\b(?:pcs|pkt|qty|unit price|amount)\b/i.test(name)) continue;
      out.push(name);
    }
  }
  return [...new Set(out)].slice(0, 8);
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

function cleanProductLine(line: string): string {
  return toDescriptionColumn(line);
}

function isProductLine(line: string): boolean {
  if (line.length < 6 || looksLikeJunkItem(line)) return false;
  if (/trading|lulu|لولو|international|customer|invoice|total|qatar|souq|shop/i.test(line)) {
    return false;
  }
  return PRODUCT_HINT.test(line) || (PRODUCT_SIZE.test(line) && /[A-Za-z\u0600-\u06FF]{3,}/.test(line));
}

function guessLineItems(text: string): string[] {
  const items: string[] = [];
  let inTable = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = cleanOcrLine(raw);
    if (!line) continue;
    if (/description|التفاصيل|الوصف/i.test(line) && /qty|unit|amount|الكمية/i.test(line)) {
      inTable = true;
      continue;
    }
    if (
      looksLikeJunkItem(line) ||
      /grand\s*total|net\s*total|discount|thank you|sales\s*tax|^total\b|^subtotal\b/i.test(line)
    ) {
      if (/total|tax|terms|payment/i.test(line)) inTable = false;
      continue;
    }
    const priced = line.match(
      new RegExp(`^(?:(\\d{1,3})\\s+)?(.+?)\\s+(${MONEY})\\s+(${MONEY})\\s*$`),
    );
    if (priced?.[2] && !looksLikeJunkItem(priced[2])) {
      items.push(priced[2].replace(/\s+/g, " ").trim());
      continue;
    }
    const numbered = line.match(
      new RegExp(`^\\d{1,3}\\s+(.+?)\\s+\\d+(?:\\.\\d+)?\\s+${PACK_UNIT}\\b`, "i"),
    );
    if (numbered?.[1] && !/trading|international|customer|invoice/i.test(numbered[1])) {
      items.push(numbered[1].replace(/\s+/g, " ").trim());
      continue;
    }
    if (isProductLine(line) || (inTable && line.length >= 8 && !isNoiseLine(line) && !looksLikeJunkItem(line))) {
      const name = cleanProductLine(line);
      if (name.length >= 4 && !looksLikeJunkItem(name) && !/trading|international/i.test(name)) {
        items.push(name);
      }
    }
  }
  return sanitizeLineItems(items);
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
  const itemsFromAi = Array.isArray(row.items) ? row.items.map((item) => String(item)) : [];
  const descriptionRaw = cleanOcrLine(String(row.description ?? ""));
  const items = sanitizeLineItems(itemsFromAi.length > 0 ? itemsFromAi : [descriptionRaw]);
  const description = buildDescription(vendor, invoiceNumber, items);
  return {
    date,
    amount: Number(amount).toFixed(2),
    description,
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
  const fromItems = sanitizeLineItems([
    ...(primary.items ?? []),
    ...(secondary.items ?? []),
    secondary.description,
    primary.description,
  ]);
  const vendor = shortVendor(primary.vendor || secondary.vendor);
  const invoiceNumber = primary.invoiceNumber || secondary.invoiceNumber;
  const description = buildDescription(vendor, invoiceNumber, fromItems);
  return {
    date: primary.date || secondary.date,
    amount: primary.amount || secondary.amount,
    description,
    type: primary.type,
    category: primary.category === categoriesForType(primary.type)[0] ? secondary.category : primary.category,
    notes: buildNotes({
      vendor,
      invoiceNumber,
      items: fromItems,
      customer: extractCustomer(`${secondary.notes}\n${primary.notes}`),
    }).slice(0, 2000),
    vendor,
    invoiceNumber,
    confidence: Math.max(primary.confidence, secondary.confidence),
    items: fromItems,
  };
}
