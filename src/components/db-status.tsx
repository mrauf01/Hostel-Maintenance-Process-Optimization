"use client";

import { useEffect, useState } from "react";
import type { DbHealth } from "@/lib/supabase/health";

export function DbStatus() {
  const [health, setHealth] = useState<DbHealth | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: DbHealth) => {
        if (!cancelled) setHealth(d);
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({
            mode: "live",
            supabaseUrl: false,
            anonKey: false,
            serviceRole: false,
            tables: {},
            approvedColumn: false,
            ok: false,
            hint: "Could not reach the health check. Redeploy or try again.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!health || health.mode === "demo" || health.ok) return null;

  return (
    <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
      <p className="font-medium">Database is not ready</p>
      <p className="mt-1 text-amber-900/90 dark:text-amber-100/80">{health.hint}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Open Supabase → SQL Editor, paste{" "}
        <code className="font-mono">supabase/FIX_DATABASE.sql</code>, click Run.
        Then confirm Vercel has the three Supabase env vars (including the
        service_role key) and Redeploy.
      </p>
    </div>
  );
}
