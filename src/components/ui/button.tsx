import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[12.5px] font-semibold disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-deep hover:shadow-[0_4px_12px_rgba(142,33,87,0.3)]",
        gold: "bg-gold-bright text-primary-deep hover:bg-white",
        outline:
          "border border-input bg-card text-foreground hover:border-primary hover:text-primary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-brand-soft",
        ghost: "hover:bg-muted hover:text-foreground",
        destructive:
          "border border-er-border bg-er-bg text-er-fg hover:bg-destructive hover:text-white",
        success:
          "border border-ok-border bg-ok-bg text-ok-fg hover:bg-success hover:text-white",
        warning:
          "border border-wn-border bg-wn-bg text-wn-fg hover:bg-warning hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-[15px] py-2",
        sm: "h-7 rounded-md px-2.5 text-[11px]",
        lg: "h-11 rounded-lg px-6 text-[15px]",
        icon: "size-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
