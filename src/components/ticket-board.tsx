"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { TicketCard } from "@/components/ticket-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { slaTone } from "@/lib/sla";
import type { Complaint, StaffCategory } from "@/lib/types";

const STATUSES = Object.keys(STATUS_LABELS);

export function TicketBoard({
  complaints,
  emptyTitle,
  emptyBody,
  actionHref,
  actionLabel,
}: {
  complaints: Complaint[];
  emptyTitle: string;
  emptyBody: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<string>("sla");

  const filtered = useMemo(() => {
    let list = [...complaints];
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(s) ||
          c.ticket_id.toLowerCase().includes(s) ||
          c.description.toLowerCase().includes(s)
      );
    }
    if (category !== "all") list = list.filter((c) => c.category === category);
    if (status !== "all") list = list.filter((c) => c.status === status);
    const rank = (c: Complaint) => {
      const t = slaTone(c.created_at, c.sla_deadline, c.status);
      return t === "breached" ? 0 : t === "at_risk" ? 1 : 2;
    };
    list.sort((a, b) => {
      if (sort === "sla") return rank(a) - rank(b);
      if (sort === "newest")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return a.priority.localeCompare(b.priority);
    });
    return list;
  }, [complaints, q, category, status, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ticket ID, title…"
          className="sm:flex-1"
          aria-label="Search complaints"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-44" aria-label="Filter category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(Object.keys(CATEGORY_LABELS) as StaffCategory[]).map((k) => (
              <SelectItem key={k} value={k}>
                {CATEGORY_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44" aria-label="Filter status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((k) => (
              <SelectItem key={k} value={k}>
                {STATUS_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-40" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sla">SLA status</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          body={emptyBody}
          actionHref={actionHref}
          actionLabel={actionLabel}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <TicketCard
              key={c.id}
              complaint={c}
              highlight={c.is_urgent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
