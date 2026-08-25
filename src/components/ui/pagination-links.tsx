import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function PaginationLinks({
  page,
  pageCount,
  previousLabel,
  nextLabel,
  hrefForPage,
}: {
  page: number;
  pageCount: number;
  previousLabel: string;
  nextLabel: string;
  hrefForPage: (page: number) => string;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
        {page > 1 ? (
          <Link href={hrefForPage(page - 1)}>{previousLabel}</Link>
        ) : (
          <span>{previousLabel}</span>
        )}
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {pageCount}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pageCount}
        asChild={page < pageCount}
      >
        {page < pageCount ? (
          <Link href={hrefForPage(page + 1)}>{nextLabel}</Link>
        ) : (
          <span>{nextLabel}</span>
        )}
      </Button>
    </div>
  );
}
