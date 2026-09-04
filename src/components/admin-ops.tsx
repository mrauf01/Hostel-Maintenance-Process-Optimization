"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { removeRegisteredPerson, setAccountApproval } from "@/actions/auth";
import { updateSlaRule, updateVendor } from "@/actions/complaints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS, PRIORITY_LABELS, ROLE_LABELS } from "@/lib/constants";
import type { Profile, SlaRule, Vendor } from "@/lib/types";

export function AdminOps({
  rules,
  staff,
  vendors,
  pendingUsers,
  people,
  wardenId,
}: {
  rules: SlaRule[];
  staff: Profile[];
  vendors: Vendor[];
  pendingUsers: Profile[];
  people: Profile[];
  wardenId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<Profile | null>(null);
  const [draft, setDraft] = useState(
    Object.fromEntries(
      rules.map((r) => [
        r.id,
        { response_minutes: r.response_minutes, resolution_hours: r.resolution_hours },
      ])
    )
  );

  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...people].sort((a, b) => a.full_name.localeCompare(b.full_name));
    if (!q) return list;
    return list.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (ROLE_LABELS[p.role] ?? p.role).toLowerCase().includes(q)
    );
  }, [people, query]);

  function remove(person: Profile) {
    start(async () => {
      const res = await removeRegisteredPerson(person.id);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`${person.full_name} was removed`);
        setRemoving(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">
            Pending registrations ({pendingUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingUsers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No accounts waiting. New signups appear here until you approve
              them.
            </p>
          )}
          {pendingUsers.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{u.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {u.email} · {ROLE_LABELS[u.role] ?? u.role}
                  {u.category ? ` · ${CATEGORY_LABELS[u.category] ?? u.category}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await setAccountApproval(u.id, true);
                      if (res.error) toast.error(res.error);
                      else {
                        toast.success("Account activated");
                        router.refresh();
                      }
                    })
                  }
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => setRemoving(u)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Registered people ({people.length})
          </CardTitle>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="sm:max-w-xs"
            aria-label="Search registered people"
          />
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            The warden can remove any account except their own. Their tickets
            are deleted; jobs assigned to them go back to the queue.
          </p>
          {filteredPeople.length === 0 && (
            <p className="text-sm text-muted-foreground">No matching accounts.</p>
          )}
          {filteredPeople.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">
                  {p.full_name}
                  {p.id === wardenId ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (you)
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.email} · {ROLE_LABELS[p.role] ?? p.role}
                  {p.category ? ` · ${CATEGORY_LABELS[p.category] ?? p.category}` : ""}
                  {p.hostel_block
                    ? ` · Block ${p.hostel_block}${p.room_number ?? ""}`
                    : ""}
                  {p.approved === false ? " · pending" : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                disabled={pending || p.id === wardenId}
                onClick={() => setRemoving(p)}
              >
                Remove
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
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
                {CATEGORY_LABELS[r.category] ?? r.category} · {PRIORITY_LABELS[r.priority] ?? r.priority}
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
      <Dialog open={Boolean(removing)} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove this person?</DialogTitle>
            <DialogDescription>
              {removing
                ? `${removing.full_name} (${removing.email}) will lose access immediately. Their student tickets are deleted; assigned jobs return to the queue.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Keep account
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !removing}
              onClick={() => removing && remove(removing)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
