import * as React from "react";
import { cn } from "@/lib/utils";

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-muted px-3 text-[13px] text-foreground focus-visible:border-primary focus-visible:bg-card focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
