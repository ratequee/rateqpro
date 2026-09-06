"use client";

import { useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
  RefreshCw,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { cn } from "@/lib/utils";
import {
  BANK_COLUMNS,
  closingBalance,
  importDescription,
  isBankCode,
  parseStatementCsv,
  statementTemplateCsv,
  toIsoDate,
  type ParsedStatementRow,
} from "@/lib/finance/statement-parse";
import { parseStatementWorkbook } from "./read-workbook";
import { importBankStatementAction, parseStatementPdfAction } from "./actions";

const BANKS = [
  { code: "QIB", name: "QIB", short: "Qatar Islamic Bank", color: "bg-brand-soft text-primary" },
  { code: "AAHLI", name: "Al Ahli Bank", short: "البنك الأهلي", color: "bg-in-bg text-info" },
  { code: "QIIB", name: "QIIB", short: "Qatar Intl Islamic", color: "bg-ok-bg text-success" },
  { code: "CBQ", name: "CBQ", short: "Commercial Bank", color: "bg-wn-bg text-warning" },
  { code: "MASRAF", name: "Masraf Al Rayan", short: "مصرف الريان", color: "bg-ok-bg text-success" },
] as const;

const ACCEPTED_EXT = new Set(["csv", "xlsx", "xls", "pdf"]);

export function BankReader({
  accounts,
  defaultAccountId,
}: {
  accounts: Array<{ id: string; name: string }>;
  defaultAccountId: string;
}) {
  const t = useTranslations("bankReader");
  const [bank, setBank] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState<ParsedStatementRow[]>([]);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [importState, importAction, importing] = useActionState(importBankStatementAction, {});

  const selected = BANKS.find((item) => item.code === bank);
  const columns = selected ? BANK_COLUMNS[selected.code] : [];

  function reset() {
    setBank(null);
    setStep(1);
    setRows([]);
    setFilter("all");
    setQuery("");
    setError(null);
    setReading(false);
  }

  function selectBank(code: string) {
    setBank(code);
    setStep(2);
    setRows([]);
    setError(null);
  }

  function downloadTemplate() {
    if (!bank || !isBankCode(bank)) return;
    const blob = new Blob([statementTemplateCsv(bank)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `template-${bank}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File | undefined) {
    if (!bank) {
      setError(t("selectFirst"));
      return;
    }
    if (!file || !isBankCode(bank)) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ACCEPTED_EXT.has(ext)) {
      setError(t("unsupported"));
      return;
    }
    setError(null);
    setReading(true);
    setStep(3);
    try {
      let parsed: ParsedStatementRow[] = [];
      if (ext === "pdf") {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("bank", bank);
        const result = await parseStatementPdfAction(formData);
        if (result.error && result.rows.length === 0) {
          throw new Error(result.error);
        }
        parsed = result.rows;
      } else if (ext === "csv") {
        parsed = parseStatementCsv(await file.text(), bank);
      } else {
        parsed = await parseStatementWorkbook(await file.arrayBuffer(), bank);
      }
      if (parsed.length === 0) {
        setRows([]);
        setError(t("noTransactions"));
        setStep(2);
        return;
      }
      setRows(parsed);
      setStep(4);
    } catch {
      setRows([]);
      setError(t("parseError"));
      setStep(2);
    } finally {
      setReading(false);
    }
  }

  const summary = useMemo(() => {
    const deposits = rows.reduce((sum, row) => sum + row.credit, 0);
    const withdrawals = rows.reduce((sum, row) => sum + row.debit, 0);
    return {
      deposits,
      withdrawals,
      count: rows.length,
      closing: closingBalance(rows),
    };
  }, [rows]);

  const visible = rows.filter((row) => {
    if (filter === "in" && row.credit <= 0) return false;
    if (filter === "out" && row.debit <= 0) return false;
    if (query) {
      const haystack = `${row.desc} ${row.accountNumber} ${row.reference}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  const importRows = visible.map((row) => ({
    date: toIsoDate(row.date) ?? row.date,
    desc: importDescription(row),
    debit: row.debit,
    credit: row.credit,
  }));

  const showAccount = rows.some((row) => row.accountNumber);
  const showRef = rows.some((row) => row.reference);
  const showBalance = rows.some((row) => row.balance != null);

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        title={t("title")}
        icon={FileSpreadsheet}
        actions={
          <Button variant="outline" size="sm" onClick={reset}>
            <RefreshCw className="size-3.5" />
            {t("newStatement")}
          </Button>
        }
      />

      <div className="grid grid-cols-4 overflow-hidden rounded-[13px] border border-border bg-card">
        {[t("step1"), t("step2"), t("step3"), t("step4")].map((label, index) => {
          const n = index + 1;
          const on = step === n;
          const done = step > n;
          return (
            <div
              key={label}
              className={cn(
                "border-e px-2.5 py-3 text-center text-[11.5px] last:border-e-0",
                on && "bg-brand-soft font-bold text-primary",
                done && "bg-ok-bg text-ok-fg",
                !on && !done && "text-ink-light",
              )}
            >
              <div
                className={cn(
                  "mx-auto mb-1 flex size-6 items-center justify-center rounded-full text-[11px] font-bold",
                  on && "bg-primary text-white",
                  done && "bg-success text-white",
                  !on && !done && "bg-muted text-ink-light",
                )}
              >
                {n}
              </div>
              {label}
            </div>
          );
        })}
      </div>

      <SectionCard title={t("selectBank")} icon={Building2}>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
          {BANKS.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => selectBank(item.code)}
              className={cn(
                "rounded-[13px] border-2 bg-card px-2.5 py-3.5 text-center transition",
                bank === item.code
                  ? "border-primary bg-brand-soft shadow-[0_0_0_3px_rgba(142,33,87,0.25)]"
                  : "border-border hover:border-primary hover:bg-brand-soft",
              )}
            >
              <div className={cn("mx-auto mb-2 flex size-11 items-center justify-center rounded-[10px]", item.color)}>
                <Building2 className="size-5" />
              </div>
              <div className="text-xs font-bold">{item.name}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{item.short}</div>
            </button>
          ))}
        </div>
        {selected ? (
          <div className="mt-3 rounded-[10px] border border-primary/25 bg-brand-soft px-4 py-3">
            <p className="mb-2 text-xs font-bold text-primary-deep">
              {t("formatFor")} {selected.name}
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-7">
              {columns.map((col) => (
                <div key={`${col.label}-${col.value}`} className="rounded-lg border border-primary/25 bg-card px-2 py-1.5">
                  <div className="text-[9.5px] text-ink-light">{col.label}</div>
                  <div className="text-[11px] font-bold text-primary-deep">{col.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {selected ? (
          <div className="mt-3 flex items-center gap-4 rounded-[13px] bg-linear-to-br from-primary-deep to-primary px-5 py-4 text-white">
            <FileSpreadsheet className="size-8 text-gold-bright" />
            <div className="flex-1">
              <div className="text-sm font-bold">
                {t("templateTitle")} {selected.name}
              </div>
              <div className="mt-0.5 text-[11px] text-white/55">{t("templateHint")}</div>
            </div>
            <Button variant="gold" size="sm" onClick={downloadTemplate}>
              <Download className="size-3.5" />
              {t("downloadTemplate")}
            </Button>
          </div>
        ) : null}
      </SectionCard>

      {bank ? (
        <SectionCard title={t("uploadTitle")} icon={Upload}>
          <label className="flex cursor-pointer flex-col items-center rounded-[13px] border-2 border-dashed border-border bg-muted px-5 py-9 text-center hover:border-primary hover:bg-brand-soft">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Upload className="mb-2.5 size-9 text-ink-light" />
            <div className="text-[15px] font-bold">{reading ? t("reading") : t("drop")}</div>
            <div className="mt-1 text-xs text-muted-foreground">{t("csvOnly")}</div>
            <div className="mt-3 flex gap-2">
              <span className="rounded-full border border-er-border bg-er-bg px-3 py-1 text-[11px] font-bold text-er-fg">
                <FileType className="me-1 inline size-3" />
                PDF
              </span>
              <span className="rounded-full border border-ok-border bg-ok-bg px-3 py-1 text-[11px] font-bold text-ok-fg">
                <FileSpreadsheet className="me-1 inline size-3" />
                Excel
              </span>
              <span className="rounded-full border border-ok-border bg-ok-bg px-3 py-1 text-[11px] font-bold text-ok-fg">
                <FileText className="me-1 inline size-3" />
                CSV
              </span>
            </div>
          </label>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </SectionCard>
      ) : null}

      {rows.length > 0 ? (
        <>
          <SectionCard title={t("summary")}>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4">
              <KpiCard accent="success" label={t("deposits")} value={summary.deposits.toLocaleString()} hint="QAR" />
              <KpiCard accent="danger" label={t("withdrawals")} value={summary.withdrawals.toLocaleString()} hint="QAR" />
              <KpiCard accent="info" label={t("count")} value={String(summary.count)} />
              <KpiCard
                accent="brand"
                label={t("closing")}
                value={summary.closing == null ? "—" : summary.closing.toLocaleString()}
                hint={summary.closing == null ? undefined : "QAR"}
              />
            </div>
          </SectionCard>
          <div className="overflow-hidden rounded-[13px] border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted px-3.5 py-2.5">
              <div className="text-[13.5px] font-bold">{t("details")}</div>
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "in", "out"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs",
                      filter === item
                        ? "border-primary bg-brand-soft font-bold text-primary"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {item === "all" ? t("all") : item === "in" ? t("deposits") : t("withdrawals")}
                  </button>
                ))}
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-8 w-40 rounded-lg border border-border bg-muted px-2.5 text-xs"
                />
              </div>
            </div>
            <div
              className={cn(
                "grid gap-2 border-b border-border bg-muted px-3.5 py-2.5 text-[11px] font-semibold text-muted-foreground",
                showBalance ? "grid-cols-[100px_1fr_110px_110px_110px]" : "grid-cols-[100px_1fr_110px_110px]",
              )}
            >
              <span>Date</span>
              <span>Description</span>
              <span>{t("debit")}</span>
              <span>{t("credit")}</span>
              {showBalance ? <span>{t("balance")}</span> : null}
            </div>
            {visible.map((row, index) => (
              <div
                key={`${row.date}-${row.reference}-${index}`}
                className={cn(
                  "grid gap-2 border-b border-muted px-3.5 py-2.5 text-[12.5px] last:border-0",
                  showBalance ? "grid-cols-[100px_1fr_110px_110px_110px]" : "grid-cols-[100px_1fr_110px_110px]",
                )}
              >
                <span>{row.date}</span>
                <span>
                  <span className="block">{row.desc}</span>
                  {showAccount || showRef ? (
                    <span className="mt-0.5 block text-[10.5px] text-muted-foreground">
                      {[
                        row.accountNumber ? `${t("accountNumber")} ${row.accountNumber}` : null,
                        row.reference ? `${t("reference")} ${row.reference}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                </span>
                <span className="font-bold text-destructive">{row.debit ? row.debit.toLocaleString() : "—"}</span>
                <span className="font-bold text-success">{row.credit ? row.credit.toLocaleString() : "—"}</span>
                {showBalance ? (
                  <span className="font-semibold">
                    {row.balance == null ? "—" : row.balance.toLocaleString()}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          {accounts.length > 0 ? (
            <form action={importAction} className="flex flex-wrap items-center justify-between gap-2 rounded-[13px] border border-border bg-card px-3.5 py-3">
              <input type="hidden" name="rows" value={JSON.stringify(importRows)} />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t("importInto")}</span>
                <select
                  name="bankAccountId"
                  defaultValue={defaultAccountId}
                  className="h-9 rounded-lg border border-input bg-muted px-2 text-sm"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                {importState.error ? (
                  <span className="text-sm text-destructive">{t("importError")}</span>
                ) : null}
                {importState.ok ? (
                  <span className="text-sm text-success">
                    {t("imported", { count: importState.imported ?? visible.length })}
                  </span>
                ) : null}
                <Button type="submit" disabled={importing || visible.length === 0}>
                  {importing ? t("importing") : t("import")}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">{t("needAccount")}</p>
          )}
        </>
      ) : null}
    </div>
  );
}
