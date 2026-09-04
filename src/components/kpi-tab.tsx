"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { listComplaintEvents } from "@/actions/complaints";
import type { Complaint, ComplaintEvent } from "@/lib/types";

const KpiDashboard = dynamic(
  () => import("@/components/kpi-dashboard").then((m) => m.KpiDashboard),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Loading charts…</p>
    ),
  }
);

export function KpiTab({ complaints }: { complaints: Complaint[] }) {
  const [events, setEvents] = useState<ComplaintEvent[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    listComplaintEvents()
      .then((rows) => {
        if (live) setEvents(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, []);

  if (error) {
    return (
      <p className="text-sm text-muted-foreground">
        KPI charts could not load. Tickets and pending registrations still work
        in the other tabs.
      </p>
    );
  }
  if (!events) {
    return (
      <p className="text-sm text-muted-foreground">Loading charts…</p>
    );
  }
  return <KpiDashboard complaints={complaints} events={events} />;
}
