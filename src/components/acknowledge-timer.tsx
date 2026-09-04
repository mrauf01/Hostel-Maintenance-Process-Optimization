"use client";

import { useEffect, useMemo, useState } from "react";
import { ACKNOWLEDGE_TARGET_MINUTES } from "@/lib/constants";

export function AcknowledgeTimer({ assignedAt }: { assignedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = useMemo(() => {
    const ms = now - new Date(assignedAt).getTime();
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return { m, s, overdue: m >= ACKNOWLEDGE_TARGET_MINUTES };
  }, [now, assignedAt]);

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        elapsed.overdue
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      <p className="font-semibold">
        Acknowledge within {ACKNOWLEDGE_TARGET_MINUTES} min
      </p>
      <p className="font-mono text-lg tabular-nums">
        {String(elapsed.m).padStart(2, "0")}:{String(elapsed.s).padStart(2, "0")}{" "}
        elapsed
        {elapsed.overdue ? " · overdue" : ""}
      </p>
    </div>
  );
}
