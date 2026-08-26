import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[13px] border border-border bg-card px-[17px] py-[15px] shadow-card",
        className,
      )}
    >
      {title || action ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? (
            <div className="flex items-center gap-1.5 text-[13.5px] font-bold">
              {Icon ? <Icon className="size-4 text-primary" /> : null}
              <span>{title}</span>
            </div>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </div>
  );
}
