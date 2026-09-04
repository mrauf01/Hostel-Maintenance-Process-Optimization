import { TARGET_RESOLUTION_DAYS } from "@/lib/constants";
import { slaTone } from "@/lib/sla";
import type { Complaint, ComplaintEvent, StaffCategory } from "@/lib/types";

export type KpiFilters = {
  from?: string;
  to?: string;
  category?: StaffCategory | "all";
};

export type KpiResult = {
  avgResolutionDays: number;
  pctOverTwoDays: number;
  closureWithinSla: number;
  avgAssignmentHours: number;
  backlog: number;
  backlogByCategory: { category: string; count: number }[];
  trend: { date: string; avgDays: number; target: number }[];
  volume: { date: string; opened: number; closed: number }[];
  slaMix: { name: string; value: number }[];
  sampleSize: number;
};

export function computeKpis(
  complaints: Complaint[],
  events: ComplaintEvent[],
  filters: KpiFilters
): KpiResult {
  const from = filters.from ? new Date(filters.from) : new Date(0);
  const to = filters.to
    ? new Date(filters.to)
    : new Date(Date.now() + 86400000);
  to.setHours(23, 59, 59, 999);

  const inRange = (iso: string) => {
    const d = new Date(iso);
    return d >= from && d <= to;
  };

  let list = complaints.filter((c) => inRange(c.created_at));
  if (filters.category && filters.category !== "all") {
    list = list.filter((c) => c.category === filters.category);
  }

  const resolved = list.filter((c) => c.resolved_at);
  const leadDays = resolved.map(
    (c) =>
      (new Date(c.resolved_at!).getTime() - new Date(c.created_at).getTime()) /
      86400000
  );
  const avgResolutionDays = leadDays.length
    ? leadDays.reduce((a, b) => a + b, 0) / leadDays.length
    : 0;
  const pctOverTwoDays = leadDays.length
    ? (leadDays.filter((d) => d > TARGET_RESOLUTION_DAYS).length /
        leadDays.length) *
      100
    : 0;
  const closedInSla = resolved.filter(
    (c) => new Date(c.resolved_at!).getTime() <= new Date(c.sla_deadline).getTime()
  ).length;
  const closureWithinSla = resolved.length
    ? (closedInSla / resolved.length) * 100
    : 0;

  const assignHours: number[] = [];
  for (const c of list) {
    const ev = events
      .filter((e) => e.complaint_id === c.id && e.event_type === "assigned")
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0];
    const at = c.assigned_at || ev?.created_at;
    if (at) {
      assignHours.push(
        (new Date(at).getTime() - new Date(c.created_at).getTime()) / 3600000
      );
    }
  }
  const avgAssignmentHours = assignHours.length
    ? assignHours.reduce((a, b) => a + b, 0) / assignHours.length
    : 0;

  const openStatuses = new Set([
    "registered",
    "assigned",
    "in_progress",
    "material_requested",
    "pending_confirmation",
    "reopened",
    "escalated",
  ]);
  const backlogList = list.filter((c) => openStatuses.has(c.status));
  const cats: StaffCategory[] = [
    "electrical",
    "plumbing",
    "furniture",
    "locks",
    "other",
  ];
  const backlogByCategory = cats.map((category) => ({
    category,
    count: backlogList.filter((c) => c.category === category).length,
  }));

  const byDay = new Map<
    string,
    { leads: number[]; opened: number; closed: number }
  >();
  for (const c of list) {
    const day = c.created_at.slice(0, 10);
    const row = byDay.get(day) ?? { leads: [], opened: 0, closed: 0 };
    row.opened += 1;
    byDay.set(day, row);
  }
  for (const c of resolved) {
    const day = c.resolved_at!.slice(0, 10);
    const row = byDay.get(day) ?? { leads: [], opened: 0, closed: 0 };
    row.closed += 1;
    row.leads.push(
      (new Date(c.resolved_at!).getTime() - new Date(c.created_at).getTime()) /
        86400000
    );
    byDay.set(day, row);
  }
  const days = Array.from(byDay.keys()).sort();
  const trend = days.map((date) => {
    const row = byDay.get(date)!;
    return {
      date: date.slice(5),
      avgDays: row.leads.length
        ? Number(
            (
              row.leads.reduce((a, b) => a + b, 0) / row.leads.length
            ).toFixed(2)
          )
        : 0,
      target: TARGET_RESOLUTION_DAYS,
    };
  });
  const volume = days.map((date) => {
    const row = byDay.get(date)!;
    return { date: date.slice(5), opened: row.opened, closed: row.closed };
  });

  const slaMixCounts = { on_track: 0, at_risk: 0, breached: 0 };
  for (const c of list) {
    slaMixCounts[slaTone(c.created_at, c.sla_deadline, c.status)] += 1;
  }

  return {
    avgResolutionDays,
    pctOverTwoDays,
    closureWithinSla,
    avgAssignmentHours,
    backlog: backlogList.length,
    backlogByCategory,
    trend,
    volume,
    slaMix: [
      { name: "On Track", value: slaMixCounts.on_track },
      { name: "At Risk", value: slaMixCounts.at_risk },
      { name: "Breached", value: slaMixCounts.breached },
    ],
    sampleSize: list.length,
  };
}
