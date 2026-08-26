const FILS_PER_UNIT = 100n;

function splitAmount(value: string): { negative: boolean; whole: string; fraction: string } {
  const trimmed = value.trim().replace(/,/g, "");
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholeRaw, fractionRaw = ""] = unsigned.split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;
  const fraction = (fractionRaw + "00").slice(0, 2);
  if (!/^\d+$/.test(whole) || !/^\d+$/.test(fraction)) {
    throw new Error("Invalid monetary amount");
  }
  return { negative, whole, fraction };
}

export function toFils(value: string | number | bigint): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  const { negative, whole, fraction } = splitAmount(String(value));
  const fils = BigInt(whole) * FILS_PER_UNIT + BigInt(fraction);
  return negative ? -fils : fils;
}

export function filsToNumber(fils: bigint): number {
  const negative = fils < 0n;
  const abs = negative ? -fils : fils;
  const whole = abs / FILS_PER_UNIT;
  const fraction = abs % FILS_PER_UNIT;
  const asNumber = Number(whole) + Number(fraction) / 100;
  return negative ? -asNumber : asNumber;
}

export function addFils(...values: bigint[]): bigint {
  return values.reduce((sum, value) => sum + value, 0n);
}

export function subFils(left: bigint, right: bigint): bigint {
  return left - right;
}

export type CurrencyConfig = {
  code: string;
  name: string;
  decimals: number;
};

export const DEFAULT_CURRENCY_CODE = "QAR";

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: "QAR", name: "Qatari Riyal", decimals: 2 },
];

export function getCurrencyConfig(code: string): CurrencyConfig {
  return (
    SUPPORTED_CURRENCIES.find((item) => item.code === code) ?? {
      code,
      name: code,
      decimals: 2,
    }
  );
}

export function formatMoney(
  amount: string | number | bigint,
  currencyCode: string,
  locale: string,
): string {
  const numeric = typeof amount === "bigint" ? filsToNumber(amount) : Number(amount);
  return new Intl.NumberFormat(locale === "ar" ? "ar-QA" : "en-QA", {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function formatAmount(
  amount: string | number | bigint,
  locale: string,
  decimals = 0,
): string {
  const numeric = typeof amount === "bigint" ? filsToNumber(amount) : Number(amount);
  return new Intl.NumberFormat(locale === "ar" ? "ar-QA" : "en-QA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numeric);
}
