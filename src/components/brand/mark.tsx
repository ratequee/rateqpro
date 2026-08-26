import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-gold-bright text-primary-deep",
        className,
      )}
    >
      <BarChart3 className="size-5" strokeWidth={2.25} />
    </div>
  );
}
