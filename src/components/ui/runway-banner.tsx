import { AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function RunwayBanner({
  label,
  months,
  unit,
  message,
  href,
  className,
}: {
  label: string;
  months: string;
  unit: string;
  message: string;
  href?: string;
  className?: string;
}) {
  const numeric = Number(months);
  const fill = Number.isFinite(numeric) ? Math.min(100, (numeric / 6) * 100) : 0;

  const inner = (
    <div
      className={cn(
        "flex items-center gap-[22px] rounded-[13px] bg-linear-to-br from-primary-deep to-primary px-[22px] py-[18px] text-white shadow-[0_6px_22px_rgba(142,33,87,0.25)] transition",
        href && "hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="min-w-[120px] shrink-0">
        <p className="mb-0.5 text-[11px] text-white/60">{label}</p>
        <p className="text-5xl font-bold leading-none text-gold-bright">{months}</p>
        <p className="mt-0.5 text-xs text-white/60">{unit}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 h-[9px] overflow-hidden rounded-[5px] bg-white/15">
          <div
            className="h-full rounded-[5px] bg-gold-bright"
            style={{ width: `${fill}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-gold-bright/35 bg-gold-bright/15 px-2.5 py-1.5 text-[11.5px] text-gold-bright">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }

  return inner;
}
