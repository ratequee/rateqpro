import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HorizontalScroll({
  children,
  className,
  minWidth = "760px",
}: {
  children: ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}
