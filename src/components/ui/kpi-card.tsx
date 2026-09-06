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
  const display =
    typeof value === "string" ? value.replace(/\u00a0/g, " ").replace(/\u202f/g, " ") : value;

  const card = (
    <div
      className={cn(
        "relative min-w-0 overflow-visible rounded-[13px] border border-border bg-card px-3 py-3.5 pe-3.5 sm:px-[15px] sm:py-[14px] transition",
        href && "hover:-translate-y-0.5 hover:shadow-hero",
        "after:absolute after:inset-y-0 after:start-0 after:w-[3.5px] after:rounded-s-[13px]",
        accents[accent],
        className,
      )}
    >
      <p className="mb-1.5 text-[10.5px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "min-w-0 max-w-full whitespace-normal break-words [overflow-wrap:anywhere] font-bold leading-tight tracking-tight text-foreground text-[clamp(0.92rem,2.6vw,1.45rem)] sm:text-[clamp(1rem,1.7vw,1.55rem)]",
          valueClassName,
        )}
      >
        {display}
      </p>
      {hint ? <p className="mt-0.5 text-[10.5px] text-ink-light">{hint}</p> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block min-w-0">
        {card}
      </Link>
    );
  }

  return card;
}
