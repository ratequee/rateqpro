import { cn } from "@/lib/utils";
import { KpiCard, type KpiAccent } from "./kpi-card";

function StatCard({
  label,
  value,
  hint,
  className,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  accent?: KpiAccent;
}) {
  return (
    <KpiCard
      label={label}
      value={value}
      hint={hint}
      accent={accent}
      className={cn("hover:translate-y-0 hover:shadow-none", className)}
    />
  );
}

export { StatCard };
