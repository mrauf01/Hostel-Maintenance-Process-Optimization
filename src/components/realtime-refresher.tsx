"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [ready, setReady] = useState(false);

  const poll = useCallback(async () => {
    const next = await listComplaintsForUser().catch(() => []);
    for (const c of next) {
      const prev = snap.current.get(c.id);
      if (prev && prev !== c.status) {
        toast.message(`${c.ticket_id} updated`, {
          description: `Now ${String(c.status ?? "").replaceAll("_", " ")}`,
        });
        router.refresh();
      }
      snap.current.set(c.id, c.status);
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    snap.current = new Map(initial.map((c) => [c.id, c.status] as const));
  }, [initial, userId]);

  useEffect(() => {
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [poll]);

  return ready ? null : null;
}
