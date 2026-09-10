"use client";

import { useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { FileUploader } from "@/components/ui/file-uploader";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  createTransactionAction,
  updateTransactionAction,
  type TransactionActionState,
} from "./actions";
import { InvoiceScanner } from "./invoice-scanner";
import {
  categoriesForType,
  type TransactionCategory,
} from "@/lib/finance/categories";
import { todayInputValue } from "@/lib/formatting/date";
import { PaymentSourceFields, defaultSourceValue } from "@/features/payments/source-fields";
import type { PaymentSourceKind } from "@/lib/finance/payment-source";

const initial: TransactionActionState = {};

type ProjectOption = { id: string; code: string; name: string };
type AccountOption = { id: string; name: string; isPrimary?: boolean };

export function TransactionForm({
  mode,
  currencyCode,
  projects,
  accounts,
  cards = [],
  advances = [],
  transaction,
}: {
  mode: "create" | "edit";
  currencyCode: string;
  projects: ProjectOption[];
  accounts: AccountOption[];
  cards?: Array<{ id: string; name: string; last4: string | null }>;
  advances?: Array<{ id: string; personName: string }>;
  transaction?: {
    id: string;
    date: string;
    type: "DEPOSIT" | "WITHDRAWAL";
    amount: string;
    description: string;
    category: string | null;
    projectId: string | null;
    notes: string | null;
    bankAccountId: string | null;
    paymentSource?: PaymentSourceKind | null;
    expenseKind?: "PROJECT" | "OPERATING" | null;
    creditCardId?: string | null;
    cashAdvanceId?: string | null;
  };
}) {
  const t = useTranslations("transactions");
  const tCommon = useTranslations("common");
  const tCat = useTranslations("transactions.categories");
  const action = mode === "create" ? createTransactionAction : updateTransactionAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const [type, setType] = useState<"DEPOSIT" | "WITHDRAWAL">(
    transaction?.type ?? "DEPOSIT",
  );
  const [date, setDate] = useState(transaction?.date ?? todayInputValue());
  const [amount, setAmount] = useState(transaction?.amount ?? "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [category, setCategory] = useState(transaction?.category ?? categoriesForType(type)[0]);
  const [expenseKind, setExpenseKind] = useState(transaction?.expenseKind ?? "OPERATING");
  const [projectId, setProjectId] = useState(transaction?.projectId ?? "");
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [source, setSource] = useState(
    defaultSourceValue(
      transaction?.paymentSource,
      transaction?.bankAccountId,
      transaction?.creditCardId,
      transaction?.cashAdvanceId,
    ) ?? (accounts[0] ? `BANK_ACCOUNT:${accounts[0].id}` : "CASH"),
  );
  const categories = useMemo(
    () => categoriesForType(type, type === "WITHDRAWAL" ? expenseKind : null),
    [type, expenseKind],
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {mode === "edit" ? <input type="hidden" name="id" value={transaction?.id} /> : null}
      {mode === "create" ? (
        <InvoiceScanner
          attachmentInputId="attachment"
          onExtract={(result) => {
            if (result.date) setDate(result.date);
            if (result.amount) setAmount(result.amount);
            if (result.description.trim()) setDescription(result.description);
            setType(result.type);
            setCategory(result.category);
            if (result.notes.trim()) setNotes(result.notes);
            if (result.type === "WITHDRAWAL") {
              setExpenseKind(
                ["rent", "salaries", "vehicles", "electricity", "internet", "marketing"].includes(
                  result.category,
                )
                  ? "OPERATING"
                  : "PROJECT",
              );
            }
          }}
        />
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="date">{t("date")}</Label>
        <Input
          id="date"
          name="date"
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">{t("type")}</Label>
        <NativeSelect
          id="type"
          name="type"
          value={type}
          onChange={(event) => {
            const next = event.target.value as "DEPOSIT" | "WITHDRAWAL";
            setType(next);
            const nextCategories = categoriesForType(next, next === "WITHDRAWAL" ? expenseKind : null);
            if (!nextCategories.includes(category as TransactionCategory)) {
              setCategory(nextCategories[0]);
            }
            if (next === "DEPOSIT") setProjectId("");
          }}
        >
          <option value="DEPOSIT">{t("deposit")}</option>
          <option value="WITHDRAWAL">{t("withdrawal")}</option>
        </NativeSelect>
      </div>
      <CurrencyInput
        id="amount"
        name="amount"
        label={t("amount")}
        currencyCode={currencyCode}
        value={amount}
        onChange={setAmount}
        required
      />
      <div className="space-y-2">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          name="description"
          required
          minLength={2}
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">{t("category")}</Label>
        <NativeSelect
          id="category"
          name="category"
          required
          value={categories.includes(category as TransactionCategory) ? category : categories[0]}
          onChange={(event) => setCategory(event.target.value)}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {tCat(item as TransactionCategory)}
            </option>
          ))}
        </NativeSelect>
      </div>
      {type === "WITHDRAWAL" ? (
        <div className="space-y-2">
          <Label htmlFor="expenseKind">{t("expenseKind")}</Label>
          <NativeSelect
            id="expenseKind"
            name="expenseKind"
            value={expenseKind}
            onChange={(event) => {
              const next = event.target.value as "PROJECT" | "OPERATING";
              setExpenseKind(next);
              const nextCategories = categoriesForType("WITHDRAWAL", next);
              if (!nextCategories.includes(category as TransactionCategory)) {
                setCategory(nextCategories[0]);
              }
              if (next !== "PROJECT") setProjectId("");
            }}
          >
            <option value="OPERATING">{t("operatingExpense")}</option>
            <option value="PROJECT">{t("projectExpense")}</option>
          </NativeSelect>
        </div>
      ) : (
        <input type="hidden" name="expenseKind" value="" />
      )}
      {type === "WITHDRAWAL" && expenseKind === "PROJECT" ? (
        <div className="space-y-2">
          <Label htmlFor="projectId">{t("project")}</Label>
          <NativeSelect
            id="projectId"
            name="projectId"
            required
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">{t("selectProject")}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} — {project.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : (
        <input type="hidden" name="projectId" value="" />
      )}
      <PaymentSourceFields
        accounts={accounts}
        cards={cards}
        advances={advances}
        value={source}
        onChange={setSource}
      />
      <div className="space-y-2">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      <FileUploader id="attachment" name="attachment" label={t("attachment")} />

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {t(
            state.error === "validation"
              ? "errors.validation"
              : state.error === "storage"
                ? "errors.storage"
                : state.error === "immutable"
                  ? "errors.immutable"
                  : state.error === "source"
                    ? "errors.source"
                    : "errors.save",
          )}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? tCommon("loading") : tCommon("save")}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/transactions">{tCommon("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
