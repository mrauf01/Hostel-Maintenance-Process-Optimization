import { Button } from "@/components/ui/button";

export function Pager({
  page,
  pageSize,
  total,
  onPage,
  noun,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  noun: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safe = Math.min(page, pages - 1);
  const from = total === 0 ? 0 : safe * pageSize + 1;
  const to = Math.min(total, (safe + 1) * pageSize);

  if (total <= pageSize) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
      <p className="text-xs text-muted-foreground">
        {from}–{to} of {total} {noun}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={safe <= 0}
          onClick={() => onPage(safe - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={safe >= pages - 1}
          onClick={() => onPage(safe + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function pageSlice<T>(list: T[], page: number, pageSize: number): T[] {
  const start = page * pageSize;
  return list.slice(start, start + pageSize);
}
