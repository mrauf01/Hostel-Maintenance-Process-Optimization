import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { slaRemaining, slaTone } from "@/lib/sla";
import type { Complaint } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SlaBadge({
  complaint,
  className,
}: {
  complaint: Complaint;
  className?: string;
}) {
  const tone = slaTone(
    complaint.created_at,
    complaint.sla_deadline,
    complaint.status
  );
  const Icon =
    tone === "breached"
      ? ShieldAlert
      : tone === "at_risk"
        ? AlertTriangle
        : complaint.status === "resolved"
          ? CheckCircle2
          : Clock;
  const label =
    tone === "breached"
      ? "Breached"
      : tone === "at_risk"
        ? "At Risk"
        : "On Track";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide transition-colors duration-200",
        tone === "on_track" &&
          "border-emerald-200 bg-emerald-50 text-emerald-800",
        tone === "at_risk" && "border-amber-200 bg-amber-50 text-amber-900",
        tone === "breached" && "border-red-200 bg-red-50 text-red-800",
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>
        {label}
        {complaint.status !== "resolved" ? ` · ${slaRemaining(complaint.sla_deadline)}` : ""}
      </span>
    </span>
  );
}
