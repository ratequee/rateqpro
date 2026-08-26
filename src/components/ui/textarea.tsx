import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-input bg-muted px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:bg-card focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
