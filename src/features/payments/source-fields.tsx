"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  buildPaymentSources,
  encodePaymentSource,
  type PaymentSourceKind,
} from "@/lib/finance/payment-source";

export function PaymentSourceFields({
  accounts,
  cards,
  advances,
  defaultValue,
  value,
  onChange,
  name = "paymentSource",
  allowEmpty = false,
  emptyLabel,
}: {
  accounts: Array<{ id: string; name: string; isPrimary?: boolean }>;
  cards: Array<{ id: string; name: string; last4?: string | null }>;
  advances: Array<{ id: string; personName: string }>;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const t = useTranslations("payments");
  const options = buildPaymentSources({
    accounts,
    cards,
    advances,
    cashLabel: t("cash"),
  });
  const fallback =
    defaultValue ??
    (accounts[0] ? encodePaymentSource("BANK_ACCOUNT", accounts[0].id) : "CASH");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{t("source")}</Label>
      <NativeSelect
        id={name}
        name={name}
        required={!allowEmpty}
        value={value}
        defaultValue={value === undefined ? (allowEmpty ? "" : fallback) : undefined}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      >
        {allowEmpty ? <option value="">{emptyLabel ?? t("source")}</option> : null}
        <optgroup label={t("bankAccounts")}>
          {options
            .filter((item) => item.kind === "BANK_ACCOUNT")
            .map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
        </optgroup>
        {options.some((item) => item.kind === "CREDIT_CARD") ? (
          <optgroup label={t("cards")}>
            {options
              .filter((item) => item.kind === "CREDIT_CARD")
              .map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
          </optgroup>
        ) : null}
        <option value="CASH">{t("cash")}</option>
        {options.some((item) => item.kind === "CUSTODY") ? (
          <optgroup label={t("custody")}>
            {options
              .filter((item) => item.kind === "CUSTODY")
              .map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
          </optgroup>
        ) : null}
      </NativeSelect>
      <p className="text-[11px] text-muted-foreground">{t("sourceHint")}</p>
    </div>
  );
}

export function defaultSourceValue(
  kind?: PaymentSourceKind | null,
  bankAccountId?: string | null,
  creditCardId?: string | null,
  cashAdvanceId?: string | null,
) {
  if (kind === "CASH") return "CASH";
  if (kind === "CREDIT_CARD" && creditCardId) return encodePaymentSource("CREDIT_CARD", creditCardId);
  if (kind === "CUSTODY" && cashAdvanceId) return encodePaymentSource("CUSTODY", cashAdvanceId);
  if (bankAccountId) return encodePaymentSource("BANK_ACCOUNT", bankAccountId);
  return undefined;
}
