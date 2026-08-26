import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
  meta,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: LucideIcon;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
      <div>
        <div className="flex items-center gap-2 text-[17px] font-bold text-foreground">
          {Icon ? <Icon className="size-[18px] text-primary" /> : null}
          <h1>{title}</h1>
        </div>
        {description ? (
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {meta}
        {actions}
      </div>
    </div>
  );
}

export { PageHeader };
