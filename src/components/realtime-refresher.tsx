"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { listComplaintsForUser } from "@/actions/complaints";
import type { Complaint } from "@/lib/types";

export function RealtimeRefresher({
  userId,
  initial,
}: {
  userId: string;
  initial: Complaint[];
}) {
  const router = useRouter();
  const snap = useRef(
    new Map(initial.map((c) => [c.id, c.status] as const))
  );

  const poll = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    const next = await listComplaintsForUser().catch(() => []);
    let changed = false;
    for (const c of next) {
      const prev = snap.current.get(c.id);
      if (prev && prev !== c.status) {
        toast.message(`${c.ticket_id} updated`, {
          description: `Now ${String(c.status ?? "").replaceAll("_", " ")}`,
        });
        changed = true;
      }
      snap.current.set(c.id, c.status);
    }
    if (changed) router.refresh();
  }, [router]);

  useEffect(() => {
    snap.current = new Map(initial.map((c) => [c.id, c.status] as const));
  }, [initial, userId]);

  useEffect(() => {
    const t = setInterval(poll, 20000);
    const onVis = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [poll]);

  return null;
}
