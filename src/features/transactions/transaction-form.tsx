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
import {
  categoriesForType,
  type TransactionCategory,
} from "@/lib/finance/categories";
import { todayInputValue } from "@/lib/formatting/date";

const initial: TransactionActionState = {};

type ProjectOption = { id: string; code: string; name: string };
type AccountOption = { id: string; name: string };

export function TransactionForm({
  mode,
  currencyCode,
  projects,
  accounts,
  transaction,
}: {
  mode: "create" | "edit";
  currencyCode: string;
  projects: ProjectOption[];
  accounts: AccountOption[];
  transaction?: {
    id: string;
    date: string;
    type: "DEPOSIT" | "WITHDRAWAL";
    amount: string;
    description: string;
    category: string | null;
    projectId: string | null;
    notes: string | null;
    bankAccountId: string;
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
  const categories = useMemo(() => categoriesForType(type), [type]);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {mode === "edit" ? <input type="hidden" name="id" value={transaction?.id} /> : null}
      <div className="space-y-2">
        <Label htmlFor="date">{t("date")}</Label>
        <Input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={transaction?.date ?? todayInputValue()}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">{t("type")}</Label>
        <NativeSelect
          id="type"
          name="type"
          value={type}
          onChange={(event) =>
            setType(event.target.value as "DEPOSIT" | "WITHDRAWAL")
          }
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
        defaultValue={transaction?.amount}
        required
      />
      <div className="space-y-2">
        <Label htmlFor="description">{t("description")}</Label>
        <Input
          id="description"
          name="description"
          required
          minLength={2}
          defaultValue={transaction?.description}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">{t("category")}</Label>
        <NativeSelect
          id="category"
          name="category"
          required
          key={type}
          defaultValue={
            transaction?.category && categories.includes(transaction.category as TransactionCategory)
              ? transaction.category
              : categories[0]
          }
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {tCat(category as TransactionCategory)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="projectId">{t("project")}</Label>
        <NativeSelect
          id="projectId"
          name="projectId"
          defaultValue={transaction?.projectId ?? ""}
        >
          <option value="">{t("noProject")}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code} — {project.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bankAccountId">{t("bankAccount")}</Label>
        <NativeSelect
          id="bankAccountId"
          name="bankAccountId"
          required
          defaultValue={transaction?.bankAccountId ?? accounts[0]?.id}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" name="notes" defaultValue={transaction?.notes ?? ""} />
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
