import { getCurrentProfile } from "@/actions/auth";
import { listComplaintsForUser } from "@/actions/complaints";
import { AppShell } from "@/components/app-shell";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { TicketBoard } from "@/components/ticket-board";
import { redirect } from "next/navigation";

export default async function ScDashboard() {
  const user = await getCurrentProfile();
  if (!user) redirect("/login");
  if (user.role !== "sc") redirect("/dashboard");
  const complaints = await listComplaintsForUser();

  return (
    <AppShell>
      <RealtimeRefresher userId={user.id} initial={complaints} />
      <h1 className="text-2xl font-semibold">Grievance queue</h1>
      <p className="text-sm text-muted-foreground">
        Urgent student flags and escalated tickets. Escalate to Admin if still
        unresolved.
      </p>
      <div className="mt-6">
        <TicketBoard
          complaints={complaints}
          emptyTitle="Grievance queue is clear"
          emptyBody="Urgent tickets appear here the moment a student flags them. Nothing needs a Student council member right now."
        />
      </div>
    </AppShell>
  );
}
