import { ISSUE_TYPES, P1_KEYWORDS } from "./constants";
import type {
  Complaint,
  IssueType,
  Priority,
  SlaRule,
  SlaTone,
  StaffCategory,
} from "./types";

export function triageIssue(
  issueType: IssueType,
  description: string,
  title: string,
  manualPriority?: Priority | null
): { category: StaffCategory; priority: Priority } {
  const meta = ISSUE_TYPES.find((i) => i.value === issueType)!;
  if (manualPriority) {
    return { category: meta.category, priority: manualPriority };
  }
  const blob = `${title} ${description}`.toLowerCase();
  const emergency = P1_KEYWORDS.some((k) => blob.includes(k));
  if (issueType === "locks" || emergency) {
    return { category: meta.category, priority: "P1" };
  }
  return { category: meta.category, priority: meta.defaultPriority };
}

export function matchSlaRule(
  rules: SlaRule[],
  category: StaffCategory,
  priority: Priority
): SlaRule | undefined {
  return (
    rules.find((r) => r.category === category && r.priority === priority) ??
    rules.find((r) => r.priority === priority) ??
    rules.find((r) => r.category === category)
  );
}

export function computeDeadline(
  createdAt: Date,
  rule: SlaRule | undefined
): Date {
  const hours = rule?.resolution_hours ?? 48;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

export function slaTone(
  createdAt: string,
  deadline: string,
  status: Complaint["status"],
  now = new Date()
): SlaTone {
  if (status === "resolved") {
    return now.getTime() <= new Date(deadline).getTime()
      ? "on_track"
      : "breached";
  }
  const start = new Date(createdAt).getTime();
  const end = new Date(deadline).getTime();
  const t = now.getTime();
  if (t >= end) return "breached";
  const ratio = (t - start) / Math.max(end - start, 1);
  if (ratio >= 0.7) return "at_risk";
  return "on_track";
}

export function slaRemaining(deadline: string, now = new Date()): string {
  const ms = new Date(deadline).getTime() - now.getTime();
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);
  const days = Math.floor(hours / 24);
  const restH = hours % 24;
  const core =
    days > 0 ? `${days}d ${restH}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return ms >= 0 ? `${core} left` : `${core} overdue`;
}
