import Link from "next/link";
import { getCurrentProfile } from "@/actions/auth";
import { listComplaintsForUser } from "@/actions/complaints";
import { AppShell } from "@/components/app-shell";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { TicketBoard } from "@/components/ticket-board";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS } from "@/lib/constants";
import { redirect } from "next/navigation";

export default async function StaffDashboard() {
  const user = await getCurrentProfile();
  if (!user) redirect("/login");
  if (user.role !== "staff") redirect("/dashboard");
  const complaints = await listComplaintsForUser();
  const mine = complaints.filter((c) => c.assigned_staff_id === user.id);
  const waitingAck = mine.filter(
    (c) => c.status === "assigned" && !c.acknowledged_at
  );

  return (
    <AppShell>
      <RealtimeRefresher userId={user.id} initial={complaints} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Work queue</h1>
          <p className="text-sm text-muted-foreground">
            {user.full_name} · {user.category ? CATEGORY_LABELS[user.category] : "Desk"}{" "}
            · {waitingAck.length} waiting for 15-min acknowledgement
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/complaints/new">Log walk-in / call</Link>
        </Button>
      </div>
      <div className="mt-6">
        <TicketBoard
          complaints={complaints}
          emptyTitle="No jobs in this category"
          emptyBody="When students log a matching issue, tickets auto-assign here. Registration desk can also log walk-ins."
        />
      </div>
    </AppShell>
  );
}
