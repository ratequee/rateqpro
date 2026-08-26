import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const accents = {
  brand: "after:bg-primary",
  success: "after:bg-success",
  warning: "after:bg-warning",
  info: "after:bg-info",
  danger: "after:bg-destructive",
  none: "after:hidden",
} as const;

export type KpiAccent = keyof typeof accents;

export function KpiCard({
  label,
  value,
  hint,
  accent = "brand",
  href,
  valueClassName,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: KpiAccent;
  href?: string;
  valueClassName?: string;
  className?: string;
}) {
  const card = (
    <div
      className={cn(
        "relative overflow-hidden rounded-[13px] border border-border bg-card px-[15px] py-[14px] transition",
        href && "hover:-translate-y-0.5 hover:shadow-hero",
        "after:absolute after:inset-y-0 after:start-0 after:w-[3.5px] after:rounded-s-[13px]",
        accents[accent],
        className,
      )}
    >
      <p className="mb-1.5 text-[10.5px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-bold leading-none tracking-tight text-foreground",
          valueClassName,
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[10.5px] text-ink-light">{hint}</p> : null}
    </div>
  );

  if (href) {
    return <Link href={href}>{card}</Link>;
  }

  return card;
}
