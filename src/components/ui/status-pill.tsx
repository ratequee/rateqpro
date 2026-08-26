import { cn } from "@/lib/utils";

const variants = {
  pending: "border-wn-border bg-wn-bg text-wn-fg",
  success: "border-ok-border bg-ok-bg text-ok-fg",
  danger: "border-er-border bg-er-bg text-er-fg",
  info: "border-in-border bg-in-bg text-in-fg",
  brand: "border-primary/25 bg-brand-soft text-primary-deep",
} as const;

export function StatusPill({
  children,
  variant = "pending",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 whitespace-nowrap rounded-full border px-2 py-[2.5px] text-[10px] font-semibold",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
