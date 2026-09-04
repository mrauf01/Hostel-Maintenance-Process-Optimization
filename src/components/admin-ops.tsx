"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSlaRule, updateVendor } from "@/actions/complaints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import type { Profile, SlaRule, Vendor } from "@/lib/types";

export function AdminOps({
  rules,
  staff,
  vendors,
}: {
  rules: SlaRule[];
  staff: Profile[];
  vendors: Vendor[];
}) {
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState(
    Object.fromEntries(
      rules.map((r) => [
        r.id,
        { response_minutes: r.response_minutes, resolution_hours: r.resolution_hours },
      ])
    )
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SLA matrix (editable)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-4"
            >
              <p className="col-span-2 text-sm font-medium sm:col-span-4">
                {CATEGORY_LABELS[r.category]} · {PRIORITY_LABELS[r.priority]}
                {r.issue_label ? ` — ${r.issue_label}` : ""}
              </p>
              <label className="text-xs">
                Response (min)
                <Input
                  type="number"
                  value={draft[r.id]?.response_minutes ?? r.response_minutes}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [r.id]: {
                        ...d[r.id],
                        response_minutes: Number(e.target.value),
                      },
                    }))
                  }
                />
              </label>
              <label className="text-xs">
                Resolution (hrs)
                <Input
                  type="number"
                  value={draft[r.id]?.resolution_hours ?? r.resolution_hours}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [r.id]: {
                        ...d[r.id],
                        resolution_hours: Number(e.target.value),
                      },
                    }))
                  }
                />
              </label>
              <div className="col-span-2 flex items-end sm:col-span-2">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await updateSlaRule({
                        id: r.id,
                        ...draft[r.id],
                      });
                      if (res.error) toast.error(res.error);
                      else toast.success("SLA rule saved");
                    })
                  }
                >
                  Save
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff roster</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                </div>
                <span className="capitalize text-xs">{s.category}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {vendors.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{v.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.specialty} · {v.contact}
                    {v.notes ? ` · ${v.notes}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={v.available ? "secondary" : "destructive"}
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await updateVendor({ id: v.id, available: !v.available });
                      toast.success(
                        v.available ? "Marked unavailable" : "Marked available"
                      );
                    })
                  }
                >
                  {v.available ? "Available" : "Unavailable"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
