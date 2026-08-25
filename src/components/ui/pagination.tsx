"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pageCount,
  onPrevious,
  onNext,
  previousLabel,
  nextLabel,
}: {
  page: number;
  pageCount: number;
  onPrevious?: () => void;
  onNext?: () => void;
  previousLabel: string;
  nextLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={onPrevious}
      >
        {previousLabel}
      </Button>
      <span className={cn("text-sm text-muted-foreground")}>
        {page} / {Math.max(pageCount, 1)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= pageCount}
        onClick={onNext}
      >
        {nextLabel}
      </Button>
    </div>
  );
}
