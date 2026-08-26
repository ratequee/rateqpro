"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Building2, Check, FileText, Info } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";

function money(value: number) {
  return `${value.toLocaleString("en-QA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR`;
}

const taxInputClass =
  "w-full rounded-[9px] border-2 border-white/25 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-gold-bright focus:bg-white/15 focus:outline-none";

export function TaxCalculator() {
  const t = useTranslations("tax");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("0");
  const [whtAmount, setWhtAmount] = useState("");
  const [whtRate, setWhtRate] = useState("5");
  const [contract, setContract] = useState("");
  const [cost, setCost] = useState("");

  const vat = useMemo(() => {
    const value = Number(amount) || 0;
    const pct = Number(rate) || 0;
    const tax = value * (pct / 100);
    return { tax, total: value + tax };
  }, [amount, rate]);

  const wht = useMemo(() => {
    const value = Number(whtAmount) || 0;
    const pct = Number(whtRate) || 0;
    const tax = value * (pct / 100);
    return { tax, net: value - tax };
  }, [whtAmount, whtRate]);

  const profit = useMemo(() => {
    const value = Number(contract) || 0;
    const execution = Number(cost) || 0;
    const gp = value - execution;
    const pct = value > 0 ? (gp / value) * 100 : 0;
    const tax = Math.max(0, gp) * 0.1;
    return { gp, pct, tax, net: gp - tax };
  }, [contract, cost]);

  return (
    <div className="grid gap-3.5 lg:grid-cols-2">
      <div className="flex flex-col gap-3.5">
        <TaxBox title={t("vatTitle")} hint={t("vatHint")}>
          <Field label={t("amount")}>
            <input className={taxInputClass} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label={t("rate")}>
            <select className={taxInputClass} value={rate} onChange={(e) => setRate(e.target.value)}>
              <option value="0">{t("rate0")}</option>
              <option value="5">{t("rate5")}</option>
              <option value="10">{t("rate10")}</option>
              <option value="15">{t("rate15")}</option>
            </select>
          </Field>
          <Result label={t("taxAmount")} value={money(vat.tax)} extraLabel={t("totalIncl")} extraValue={money(vat.total)} />
        </TaxBox>
        <TaxBox title={t("whtTitle")} hint={t("whtHint")}>
          <Field label={t("payment")}>
            <input className={taxInputClass} type="number" value={whtAmount} onChange={(e) => setWhtAmount(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label={t("serviceType")}>
            <select className={taxInputClass} value={whtRate} onChange={(e) => setWhtRate(e.target.value)}>
              <option value="5">{t("general")}</option>
              <option value="7">{t("construction")}</option>
              <option value="5">{t("consulting")}</option>
            </select>
          </Field>
          <Result label={t("whtAmount")} value={money(wht.tax)} extraLabel={t("netPayment")} extraValue={money(wht.net)} />
        </TaxBox>
      </div>
      <div className="flex flex-col gap-3.5">
        <TaxBox title={t("profitTitle")} hint={t("profitHint")}>
          <Field label={t("contractValue")}>
            <input className={taxInputClass} type="number" value={contract} onChange={(e) => setContract(e.target.value)} placeholder="0" />
          </Field>
          <Field label={t("executionCost")}>
            <input className={taxInputClass} type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
          </Field>
          <div className="mt-3 rounded-[10px] border border-gold-bright/40 bg-gold-bright/15 p-3 text-[13px]">
            <Row label={t("grossMargin")} value={money(profit.gp)} />
            <Row label={t("profitRate")} value={`${profit.pct.toFixed(1)}%`} />
            <Row label={t("corpTax")} value={money(profit.tax)} />
            <Row label={t("netAfterTax")} value={money(profit.net)} gold />
          </div>
        </TaxBox>
        <SectionCard title={t("lawsTitle")} icon={Info} className="border-primary/25">
          <div className="flex flex-col gap-2 text-[12.5px]">
            <Note icon={Check} tone="ok" title="Corporate Tax" body={t("corpNote")} />
            <Note icon={AlertTriangle} tone="wn" title="VAT" body={t("vatNote")} />
            <Note icon={FileText} tone="in" title="WHT" body={t("whtNote")} />
            <Note icon={Building2} tone="brand" title="QFC" body={t("qfcNote")} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function TaxBox({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[13px] bg-linear-to-br from-primary-deep to-primary p-5 text-white">
      <div className="mb-0.5 text-sm font-bold">{title}</div>
      <div className="mb-3.5 text-[11px] text-white/55">{hint}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <label className="mb-1.5 block text-[11.5px] text-white/60">{label}</label>
      {children}
    </div>
  );
}

function Result({
  label,
  value,
  extraLabel,
  extraValue,
}: {
  label: string;
  value: string;
  extraLabel: string;
  extraValue: string;
}) {
  return (
    <div className="mt-3 rounded-[10px] border border-gold-bright/40 bg-gold-bright/15 p-3">
      <p className="mb-1 text-[11px] text-white/60">{label}</p>
      <p className="text-[28px] font-bold text-gold-bright">{value}</p>
      <div className="mt-2 flex justify-between text-xs text-white/70">
        <span>{extraLabel}</span>
        <span className="font-bold text-gold-bright">{extraValue}</span>
      </div>
    </div>
  );
}

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex justify-between border-b border-white/10 py-2 last:border-0">
      <span className={gold ? "font-bold text-gold-bright" : "text-white/70"}>{label}</span>
      <span className={gold ? "text-lg font-bold text-gold-bright" : "font-bold"}>{value}</span>
    </div>
  );
}

function Note({
  icon: Icon,
  tone,
  title,
  body,
}: {
  icon: typeof Check;
  tone: "ok" | "wn" | "in" | "brand";
  title: string;
  body: string;
}) {
  const wrap = {
    ok: "bg-ok-bg",
    wn: "bg-wn-bg",
    in: "bg-in-bg",
    brand: "bg-brand-soft",
  };
  const icon = {
    ok: "text-success",
    wn: "text-warning",
    in: "text-info",
    brand: "text-primary",
  };
  return (
    <div className={cn("flex items-start gap-2 rounded-lg p-2", wrap[tone])}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", icon[tone])} />
      <div>
        <b>{title}:</b> {body}
      </div>
    </div>
  );
}
