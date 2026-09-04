"use client";

import { LIFECYCLE_STEPS, STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { Complaint, ComplaintEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

function stepIndex(status: Complaint["status"]): number {
  if (status === "registered") return 0;
  if (status === "assigned" || status === "reopened") return 1;
  if (
    status === "in_progress" ||
    status === "material_requested" ||
    status === "escalated"
  )
    return 2;
  if (status === "pending_confirmation" || status === "resolved") return 3;
  return 0;
}

export function TicketTimeline({
  complaint,
  events,
}: {
  complaint: Complaint;
  events: ComplaintEvent[];
}) {
  const current = stepIndex(complaint.status);
  const resolved = complaint.status === "resolved";

  return (
    <div className="space-y-6">
      <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
        {LIFECYCLE_STEPS.map((step, i) => {
          const done = i < current || (i === 3 && resolved);
          const isCurrent = i === current && !resolved;
          const isEscalated = complaint.status === "escalated" && i === 2;
          return (
            <li key={step.key} className="flex flex-1 items-stretch gap-3 sm:flex-col sm:items-center">
              <div className="flex flex-col items-center sm:w-full sm:flex-row">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-200",
                    done &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent &&
                      "step-current border-primary bg-background text-primary",
                    !done &&
                      !isCurrent &&
                      "border-muted-foreground/30 bg-muted text-muted-foreground",
                    isEscalated && "border-fuchsia-600 text-fuchsia-700"
                  )}
                >
                  {done ? "✓" : i + 1}
                </div>
                {i < LIFECYCLE_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-8 w-0.5 sm:h-0.5 sm:flex-1 sm:w-auto",
                      i < current ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
              <p
                className={cn(
                  "pb-4 text-sm font-medium sm:mt-2 sm:pb-0 sm:text-center",
                  done || isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {isEscalated ? "Escalated" : step.label}
              </p>
            </li>
          );
        })}
      </ol>

      {complaint.further_escalation && (
        <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-sm text-fuchsia-900">
          Further Escalation flagged. Admin resolution did not close this
          ticket.
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Audit trail</h3>
        <ol className="relative space-y-4 border-l border-border pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm font-medium">
                {STATUS_LABELS[e.event_type] ??
                  e.event_type.replaceAll("_", " ")}
              </p>
              {e.note && (
                <p className="text-sm text-muted-foreground">{e.note}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {e.actor?.full_name ?? "System"} · {formatDateTime(e.created_at)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
