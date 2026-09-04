import Link from "next/link";
import {
  AlertTriangle,
  Fan,
  Hammer,
  KeyRound,
  Lightbulb,
  ShowerHead,
} from "lucide-react";
import { CATEGORY_LABELS, ISSUE_TYPES, PRIORITY_LABELS } from "@/lib/constants";
import { relativeTime } from "@/lib/format";
import type { Complaint } from "@/lib/types";
import { SlaBadge } from "@/components/sla-badge";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

const icons = {
  room_furniture: Hammer,
  bathroom: ShowerHead,
  electricity: Lightbulb,
  fan_light: Fan,
  locks: KeyRound,
  other: AlertTriangle,
};

export function TicketCard({
  complaint,
  highlight,
}: {
  complaint: Complaint;
  highlight?: boolean;
}) {
  const Icon = icons[complaint.issue_type] ?? Hammer;
  const issue = ISSUE_TYPES.find((i) => i.value === complaint.issue_type);
  return (
    <Link
      href={`/complaints/${complaint.ticket_id}`}
      className={cn(
        "group block rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        highlight && "ring-2 ring-amber-400"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">
              {complaint.ticket_id}
            </p>
            <h3 className="truncate text-sm font-semibold leading-snug">
              {complaint.title}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {issue?.label} · {CATEGORY_LABELS[complaint.category]} ·{" "}
              {relativeTime(complaint.created_at)}
            </p>
          </div>
        </div>
        {complaint.is_urgent && (
          <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Urgent
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={complaint.status} />
        <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {PRIORITY_LABELS[complaint.priority]}
        </span>
        <SlaBadge complaint={complaint} />
      </div>
      {complaint.assigned_staff && (
        <p className="mt-2 text-xs text-muted-foreground">
          Assigned: {complaint.assigned_staff.full_name}
        </p>
      )}
    </Link>
  );
}
