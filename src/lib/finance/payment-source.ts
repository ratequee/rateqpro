export const PAYMENT_SOURCE_KINDS = [
  "BANK_ACCOUNT",
  "CREDIT_CARD",
  "CASH",
  "CUSTODY",
] as const;

export type PaymentSourceKind = (typeof PAYMENT_SOURCE_KINDS)[number];

export type PaymentSourceOption = {
  value: string;
  kind: PaymentSourceKind;
  id: string | null;
  label: string;
};

export function parsePaymentSource(value: string): {
  kind: PaymentSourceKind;
  id: string | null;
} {
  if (value === "CASH" || value.startsWith("CASH:")) {
    return { kind: "CASH", id: null };
  }
  const [kind, id] = value.split(":");
  if (kind === "BANK_ACCOUNT" && id) return { kind: "BANK_ACCOUNT", id };
  if (kind === "CREDIT_CARD" && id) return { kind: "CREDIT_CARD", id };
  if (kind === "CUSTODY" && id) return { kind: "CUSTODY", id };
  return { kind: "BANK_ACCOUNT", id: id || null };
}

export function encodePaymentSource(kind: PaymentSourceKind, id?: string | null) {
  if (kind === "CASH") return "CASH";
  return id ? `${kind}:${id}` : kind;
}

export function sourceDisplayName(input: {
  kind: PaymentSourceKind;
  bankAccountName?: string | null;
  cardName?: string | null;
  cardLast4?: string | null;
  custodyName?: string | null;
  cashLabel: string;
}) {
  if (input.kind === "CASH") return input.cashLabel;
  if (input.kind === "CREDIT_CARD") {
    return input.cardLast4 ? `${input.cardName ?? "Card"} ••${input.cardLast4}` : (input.cardName ?? "Card");
  }
  if (input.kind === "CUSTODY") return input.custodyName ?? "Custody";
  return input.bankAccountName ?? "Bank";
}

export function buildPaymentSources(input: {
  accounts: Array<{ id: string; name: string; isPrimary?: boolean }>;
  cards: Array<{ id: string; name: string; last4?: string | null }>;
  advances: Array<{ id: string; personName: string }>;
  cashLabel: string;
}): PaymentSourceOption[] {
  const bankAccounts = input.accounts.filter((account) => account.name !== "Cash");
  const options: PaymentSourceOption[] = [
    ...bankAccounts.map((account) => ({
      value: encodePaymentSource("BANK_ACCOUNT", account.id),
      kind: "BANK_ACCOUNT" as const,
      id: account.id,
      label: account.isPrimary ? `${account.name}` : account.name,
    })),
    ...input.cards.map((card) => ({
      value: encodePaymentSource("CREDIT_CARD", card.id),
      kind: "CREDIT_CARD" as const,
      id: card.id,
      label: card.last4 ? `${card.name} ••${card.last4}` : card.name,
    })),
    {
      value: "CASH",
      kind: "CASH",
      id: null,
      label: input.cashLabel,
    },
    ...input.advances.map((advance) => ({
      value: encodePaymentSource("CUSTODY", advance.id),
      kind: "CUSTODY" as const,
      id: advance.id,
      label: advance.personName,
    })),
  ];
  return options;
}
