import { STATUS_LABELS } from "@/lib/constants";
import type { ComplaintStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<ComplaintStatus, string> = {
  registered: "bg-zinc-100 text-zinc-700 border-zinc-200",
  assigned: "bg-sky-50 text-sky-800 border-sky-200",
  in_progress: "bg-blue-50 text-blue-800 border-blue-200",
  material_requested: "bg-orange-50 text-orange-900 border-orange-200",
  pending_confirmation: "bg-violet-50 text-violet-800 border-violet-200",
  resolved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  reopened: "bg-rose-50 text-rose-800 border-rose-200",
  escalated: "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ComplaintStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize transition-colors duration-200",
        styles[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
