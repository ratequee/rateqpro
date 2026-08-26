"use client";

import { useMemo, useState } from "react";
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

const BANKS = [
  { code: "QIB", name: "QIB", short: "Qatar Islamic Bank", color: "bg-brand-soft text-primary" },
  { code: "AAHLI", name: "Al Ahli Bank", short: "البنك الأهلي", color: "bg-in-bg text-info" },
  { code: "QIIB", name: "QIIB", short: "Qatar Intl Islamic", color: "bg-ok-bg text-success" },
  { code: "CBQ", name: "CBQ", short: "Commercial Bank", color: "bg-wn-bg text-warning" },
  { code: "MASRAF", name: "Masraf Al Rayan", short: "مصرف الريان", color: "bg-ok-bg text-success" },
] as const;

const COLS: Record<string, { label: string; value: string }[]> = {
  QIB: [
    { label: "A", value: "Date" },
    { label: "B", value: "Description" },
    { label: "C", value: "Ref" },
    { label: "D", value: "Debit" },
    { label: "E", value: "Credit" },
  ],
  AAHLI: [
    { label: "A", value: "Date" },
    { label: "B", value: "Description" },
    { label: "C", value: "Withdrawn" },
    { label: "D", value: "Deposited" },
    { label: "E", value: "Balance" },
  ],
  QIIB: [
    { label: "A", value: "Date" },
    { label: "B", value: "Description" },
    { label: "C", value: "Debit" },
    { label: "D", value: "Credit" },
    { label: "E", value: "Balance" },
  ],
  CBQ: [
    { label: "A", value: "Date" },
    { label: "B", value: "Value date" },
    { label: "C", value: "Description" },
    { label: "D", value: "Out" },
    { label: "E", value: "In" },
  ],
  MASRAF: [
    { label: "A", value: "Date" },
    { label: "B", value: "Description" },
    { label: "C", value: "Ref" },
    { label: "D", value: "Debit" },
    { label: "E", value: "Credit" },
  ],
};

type ParsedRow = {
  date: string;
  desc: string;
  debit: number;
  credit: number;
  balance: number | null;
};

export function BankReader() {
  const t = useTranslations("bankReader");
  const [bank, setBank] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = BANKS.find((item) => item.code === bank);

  function reset() {
    setBank(null);
    setStep(1);
    setRows([]);
    setFilter("all");
    setQuery("");
    setError(null);
  }

  function selectBank(code: string) {
    setBank(code);
    setStep(2);
    setRows([]);
    setError(null);
  }

  function downloadTemplate() {
    if (!bank) return;
    const cols = COLS[bank] ?? [];
    const header = cols.map((col) => col.value).join(",");
    const sample = "01/07/2026,Incoming transfer,REF-001,,10000\n02/07/2026,Salaries,REF-002,16500,";
    const blob = new Blob([`${header}\n${sample}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `template-${bank}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(file: File | undefined) {
    if (!bank) {
      setError(t("selectFirst"));
      return;
    }
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv") {
      setError(t("unsupported"));
      return;
    }
    setError(null);
    setStep(3);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsv(text);
      setRows(parsed);
      setStep(4);
    };
    reader.readAsText(file, "UTF-8");
  }

  const summary = useMemo(() => {
    const deposits = rows.reduce((sum, row) => sum + row.credit, 0);
    const withdrawals = rows.reduce((sum, row) => sum + row.debit, 0);
    return { deposits, withdrawals, count: rows.length };
  }, [rows]);

  const visible = rows.filter((row) => {
    if (filter === "in" && row.credit <= 0) return false;
    if (filter === "out" && row.debit <= 0) return false;
    if (query && !row.desc.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

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
            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-5">
              {(COLS[selected.code] ?? []).map((col) => (
                <div key={col.label} className="rounded-lg border border-primary/25 bg-card px-2 py-1.5">
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
              accept=".csv"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <Upload className="mb-2.5 size-9 text-ink-light" />
            <div className="text-[15px] font-bold">{t("drop")}</div>
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
              <span className="rounded-full border border-in-border bg-in-bg px-3 py-1 text-[11px] font-bold text-in-fg">
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
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <KpiCard accent="success" label={t("deposits")} value={summary.deposits.toLocaleString()} hint="QAR" />
              <KpiCard accent="danger" label={t("withdrawals")} value={summary.withdrawals.toLocaleString()} hint="QAR" />
              <KpiCard accent="info" label={t("count")} value={String(summary.count)} />
              <KpiCard accent="brand" label={t("closing")} value="—" />
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
            <div className="grid grid-cols-[100px_1fr_110px_110px] gap-2 border-b border-border bg-muted px-3.5 py-2.5 text-[11px] font-semibold text-muted-foreground">
              <span>Date</span>
              <span>Description</span>
              <span>{t("debit")}</span>
              <span>{t("credit")}</span>
            </div>
            {visible.map((row, index) => (
              <div
                key={`${row.date}-${index}`}
                className="grid grid-cols-[100px_1fr_110px_110px] gap-2 border-b border-muted px-3.5 py-2.5 text-[12.5px] last:border-0"
              >
                <span>{row.date}</span>
                <span>{row.desc}</span>
                <span className="font-bold text-destructive">{row.debit ? row.debit.toLocaleString() : "—"}</span>
                <span className="font-bold text-success">{row.credit ? row.credit.toLocaleString() : "—"}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
  const rows: ParsedRow[] = [];
  for (const line of lines.slice(1)) {
    if (line.length < 3) continue;
    const date = line[0] ?? "";
    const desc = line[1] ?? "";
    if (!desc) continue;
    const nums = line.slice(2).map((cell) => Number(String(cell).replace(/,/g, "")) || 0);
    const debit = nums[0] ?? 0;
    const credit = nums[1] ?? 0;
    if (!debit && !credit) continue;
    rows.push({ date, desc, debit, credit, balance: nums[2] ?? null });
  }
  return rows;
}
