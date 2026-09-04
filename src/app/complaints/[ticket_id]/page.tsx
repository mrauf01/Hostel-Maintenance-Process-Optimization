import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/actions/auth";
import { getComplaintByTicket, listStaff } from "@/actions/complaints";
import { AppShell } from "@/components/app-shell";
import { SlaBadge } from "@/components/sla-badge";
import { StatusBadge } from "@/components/status-badge";
import { TicketActions } from "@/components/ticket-actions";
import { TicketTimeline } from "@/components/ticket-timeline";
import { CATEGORY_LABELS, ISSUE_TYPES, PRIORITY_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export default async function TicketPage({
  params,
}: {
  params: { ticket_id: string };
}) {
  const user = await getCurrentProfile();
  if (!user) redirect("/login");
  const data = await getComplaintByTicket(params.ticket_id);
  if (!data) notFound();
  const { complaint, events } = data;
  const staff = await listStaff();
  const issue = ISSUE_TYPES.find((i) => i.value === complaint.issue_type);

  return (
    <AppShell>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-sm text-muted-foreground">
            {complaint.ticket_id}
          </p>
          <h1 className="text-2xl font-semibold">{complaint.title}</h1>
          <p className="text-sm text-muted-foreground">
            {issue?.label} · {CATEGORY_LABELS[complaint.category]} ·{" "}
            {PRIORITY_LABELS[complaint.priority]} · logged{" "}
            {formatDateTime(complaint.created_at)}
            {complaint.student
              ? ` · ${complaint.student.full_name}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={complaint.status} />
          <SlaBadge complaint={complaint} />
          {complaint.is_urgent && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">
              Urgent
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 rounded-2xl border bg-card p-5">
          <p className="text-sm leading-relaxed">{complaint.description}</p>
          {complaint.photo_url && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Issue photo
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={complaint.photo_url}
                alt="Reported issue"
                className="max-h-72 rounded-lg border object-cover"
              />
            </div>
          )}
          {complaint.completion_photo_url && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Completion photo
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={complaint.completion_photo_url}
                alt="Completed work"
                className="max-h-72 rounded-lg border object-cover"
              />
            </div>
          )}
          <TicketTimeline complaint={complaint} events={events} />
        </div>
        <aside className="h-fit rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Actions</h2>
          <TicketActions
            complaint={complaint}
            role={user.role}
            staff={staff}
          />
        </aside>
      </div>
    </AppShell>
  );
}
