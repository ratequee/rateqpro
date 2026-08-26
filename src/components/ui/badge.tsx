import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-[2.5px] text-[10px] font-semibold",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        gold: "border-transparent bg-gold-300 text-brand-700",
        outline: "text-foreground",
        success: "border-ok-border bg-ok-bg text-ok-fg",
        warning: "border-wn-border bg-wn-bg text-wn-fg",
        danger: "border-er-border bg-er-bg text-er-fg",
        info: "border-in-border bg-in-bg text-in-fg",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
