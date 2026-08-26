import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { RecordActionState } from "./state";

export async function revalidateApp(paths: string[]): Promise<void> {
  const locale = await getLocale();
  for (const path of paths) {
    revalidatePath(`/${locale}${path}`);
  }
}

export function okState(): RecordActionState {
  return { ok: true, at: Date.now() };
}

export function failState(): RecordActionState {
  return { error: true };
}

export function nextCodedValue(last: string | null | undefined, prefix: string): string {
  const match = last?.match(new RegExp(`^${prefix}-(\\d+)$`));
  const next = match ? Number(match[1]) + 1 : 1;
  return `${prefix}-${String(next).padStart(4, "0")}`;
}

export function serializeMoney(value: { toString(): string } | string | number): string {
  const n = Number(typeof value === "object" ? value.toString() : value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}
