import { getInitials } from "@/lib/formatting/initials";
import { cn } from "@/lib/utils";

const tones = {
  brand: "bg-brand-soft text-primary",
  gold: "bg-gold-bright text-primary-deep",
  solid: "bg-primary text-white",
  warning: "bg-wn-bg text-wn-fg",
  danger: "bg-er-bg text-er-fg",
  success: "bg-ok-bg text-ok-fg",
  info: "bg-in-bg text-in-fg",
} as const;

const sizes = {
  sm: "size-[26px] text-[11px]",
  md: "size-[34px] text-[13px]",
  lg: "size-[42px] text-base",
} as const;

export function InitialsAvatar({
  name,
  tone = "brand",
  size = "md",
  className,
}: {
  name: string;
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        tones[tone],
        sizes[size],
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
