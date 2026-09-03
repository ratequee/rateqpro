export function PageLoading() {
  return (
    <div className="flex flex-col gap-3.5" aria-hidden>
      <div className="h-7 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-[88px] animate-pulse rounded-[13px] bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[13px] bg-muted" />
    </div>
  );
}
