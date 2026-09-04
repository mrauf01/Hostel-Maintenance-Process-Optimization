import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentProfile } from "@/actions/auth";
import { listComplaintsForUser } from "@/actions/complaints";
import { AppShell } from "@/components/app-shell";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { TicketBoard } from "@/components/ticket-board";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function StudentDashboard() {
  const user = await getCurrentProfile();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/dashboard");
  const complaints = await listComplaintsForUser();
  const open = complaints.filter((c) => c.status !== "resolved");
  const pendingConfirm = complaints.filter(
    (c) => c.status === "pending_confirmation"
  );

  return (
    <AppShell>
      <RealtimeRefresher userId={user.id} initial={complaints} />
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Your complaints</h1>
          <p className="text-sm text-muted-foreground">
            {user.full_name} · Block {user.hostel_block}
            {user.room_number} · {open.length} open
            {pendingConfirm.length
              ? ` · ${pendingConfirm.length} waiting for your confirmation`
              : ""}
          </p>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/complaints/new">
            <Plus className="h-4 w-4" /> New complaint
          </Link>
        </Button>
      </div>
      <div className="mt-6">
        <TicketBoard
          complaints={complaints}
          emptyTitle="No complaints yet"
          emptyBody="When something breaks in your room or block, log it here. You’ll get a ticket ID and live status — no more chasing the desk."
          actionHref="/complaints/new"
          actionLabel="Log a complaint"
        />
      </div>
      <Link
        href="/complaints/new"
        className="fixed bottom-5 right-5 z-30 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform duration-200 hover:scale-105 sm:hidden"
      >
        <Plus className="h-5 w-5" /> New
      </Link>
    </AppShell>
  );
}
