import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const patternMap: Record<string, string> = {
  "dd/MM/yyyy": "dd/MM/yyyy",
  "MM/dd/yyyy": "MM/dd/yyyy",
  "yyyy-MM-dd": "yyyy-MM-dd",
};

export function formatDate(
  value: Date | string,
  dateFormat: string,
  locale: string,
): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  const pattern = patternMap[dateFormat] ?? "dd/MM/yyyy";
  return format(date, pattern, { locale: locale === "ar" ? ar : enUS });
}

export function toDateInputValue(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateInputValue(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function todayInputValue(): string {
  return toDateInputValue(new Date());
}
