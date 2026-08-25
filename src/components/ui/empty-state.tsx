import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-12",
        className,
      )}
    >
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
