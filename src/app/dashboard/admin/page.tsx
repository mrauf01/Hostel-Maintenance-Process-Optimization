import { getCurrentProfile, listPendingAccounts } from "@/actions/auth";
import {
  listComplaintEvents,
  listComplaintsForUser,
  listSlaRules,
  listStaff,
  listVendors,
} from "@/actions/complaints";
import { AdminOps } from "@/components/admin-ops";
import { AppShell } from "@/components/app-shell";
import { KpiDashboard } from "@/components/kpi-dashboard";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { TicketBoard } from "@/components/ticket-board";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const user = await getCurrentProfile();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  const complaints = await listComplaintsForUser();
  const events = await listComplaintEvents();
  const rules = await listSlaRules();
  const staff = await listStaff();
  const vendors = await listVendors();
  const pendingUsers = await listPendingAccounts();
  const breached = complaints.filter((c) => {
    if (c.status === "resolved") return false;
    return new Date(c.sla_deadline).getTime() < Date.now();
  });

  return (
    <AppShell>
      <RealtimeRefresher userId={user.id} initial={complaints} />
      <h1 className="text-2xl font-semibold">Operations overview</h1>
      <p className="text-sm text-muted-foreground">
        Deliverable 3 — KPI monitoring toward a 2-day resolution target.{" "}
        {breached.length} ticket{breached.length === 1 ? "" : "s"} currently
        past SLA.
      </p>
      <Tabs defaultValue="kpis" className="mt-6">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="kpis">KPI dashboard</TabsTrigger>
          <TabsTrigger value="tickets">All tickets</TabsTrigger>
          <TabsTrigger value="ops">SLA, staff & vendors</TabsTrigger>
        </TabsList>
        <TabsContent value="kpis" className="mt-4">
          <KpiDashboard complaints={complaints} events={events} />
        </TabsContent>
        <TabsContent value="tickets" className="mt-4">
          <TicketBoard
            complaints={complaints}
            emptyTitle="No tickets in range"
            emptyBody="Complaints from every block land here for reassignment and SLA oversight."
          />
        </TabsContent>
        <TabsContent value="ops" className="mt-4">
          <AdminOps
            rules={rules}
            staff={staff}
            vendors={vendors}
            pendingUsers={pendingUsers}
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
