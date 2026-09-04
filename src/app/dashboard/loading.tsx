export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="mt-2 h-4 w-80 animate-pulse rounded-md bg-muted" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border bg-card" />
        ))}
      </div>
    </div>
  );
}
