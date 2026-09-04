import { createAdminClient } from "@/lib/supabase/admin";
import { TICKET_PREFIX } from "@/lib/constants";
import { computeDeadline, matchSlaRule, triageIssue } from "@/lib/sla";
import type {
  AppNotification,
  Complaint,
  ComplaintEvent,
  ComplaintStatus,
  IssueType,
  Priority,
  Profile,
  SlaRule,
  StaffCategory,
  Vendor,
} from "@/lib/types";

function db() {
  const c = createAdminClient();
  if (!c) throw new Error("Supabase service role is not configured.");
  return c;
}

function logDb(label: string, error: { message: string } | null) {
  if (error) console.error(`[supabase ${label}]`, error.message);
}

export async function sbListProfiles(): Promise<Profile[]> {
  const { data, error } = await db().from("profiles").select("*");
  logDb("profiles", error);
  return (data ?? []) as Profile[];
}

export async function sbListStaff(): Promise<Profile[]> {
  const { data, error } = await db()
    .from("profiles")
    .select("*")
    .eq("role", "staff");
  logDb("staff", error);
  return (data ?? []) as Profile[];
}

export async function sbListSlaRules(): Promise<SlaRule[]> {
  const { data, error } = await db().from("sla_rules").select("*");
  logDb("sla_rules", error);
  return (data ?? []) as SlaRule[];
}

export async function sbListVendors(): Promise<Vendor[]> {
  const { data, error } = await db().from("vendors").select("*");
  logDb("vendors", error);
  return (data ?? []) as Vendor[];
}

export async function sbListEvents(): Promise<ComplaintEvent[]> {
  const { data, error } = await db()
    .from("complaint_events")
    .select("*")
    .order("created_at", { ascending: true });
  logDb("events", error);
  return (data ?? []) as ComplaintEvent[];
}

async function hydrate(rows: Complaint[]): Promise<Complaint[]> {
  if (!rows.length) return [];
  const profiles = await sbListProfiles();
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return rows.map((c) => ({
    ...c,
    student: byId.get(c.student_id),
    assigned_staff: c.assigned_staff_id
      ? byId.get(c.assigned_staff_id) ?? null
      : null,
  }));
}

export async function sbListComplaints(): Promise<Complaint[]> {
  const { data, error } = await db()
    .from("complaints")
    .select("*")
    .order("created_at", { ascending: false });
  logDb("complaints", error);
  return hydrate((data ?? []) as Complaint[]);
}

export async function sbGetComplaint(ticketId: string): Promise<{
  complaint: Complaint;
  events: ComplaintEvent[];
} | null> {
  const id = decodeURIComponent(ticketId).trim();
  const client = db();
  let row: Complaint | null = null;
  const byCode = await client
    .from("complaints")
    .select("*")
    .eq("ticket_id", id)
    .maybeSingle();
  logDb("complaint_by_ticket", byCode.error);
  if (byCode.data) row = byCode.data as Complaint;
  if (!row) {
    const byId = await client.from("complaints").select("*").eq("id", id).maybeSingle();
    logDb("complaint_by_id", byId.error);
    if (byId.data) row = byId.data as Complaint;
  }
  if (!row) return null;
  const [hydrated] = await hydrate([row]);
  const { data: events, error: e2 } = await client
    .from("complaint_events")
    .select("*")
    .eq("complaint_id", hydrated.id)
    .order("created_at", { ascending: true });
  logDb("complaint_events", e2);
  const profiles = await sbListProfiles();
  const byProfile = new Map(profiles.map((p) => [p.id, p]));
  return {
    complaint: hydrated,
    events: ((events ?? []) as ComplaintEvent[]).map((e) => ({
      ...e,
      actor: e.actor_id ? byProfile.get(e.actor_id) ?? null : null,
    })),
  };
}

export async function sbListNotifications(
  userId: string
): Promise<AppNotification[]> {
  const { data, error } = await db()
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  logDb("notifications", error);
  return (data ?? []) as AppNotification[];
}

export async function sbMarkNotificationsRead(userId: string) {
  await db()
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
}

async function sbNotify(
  userId: string,
  title: string,
  body: string,
  complaintId: string | null
) {
  await db().from("notifications").insert({
    user_id: userId,
    title,
    body,
    complaint_id: complaintId,
  });
}

async function sbEvent(
  complaintId: string,
  actorId: string | null,
  eventType: string,
  note?: string
) {
  await db().from("complaint_events").insert({
    complaint_id: complaintId,
    actor_id: actorId,
    event_type: eventType,
    note: note ?? null,
  });
}

async function leastBusy(category: StaffCategory): Promise<Profile | undefined> {
  const staff = await sbListStaff();
  const pool = staff.filter((p) => p.category === category);
  if (!pool.length) return undefined;
  const open = await db()
    .from("complaints")
    .select("assigned_staff_id,status")
    .neq("status", "resolved");
  const counts = new Map<string, number>();
  for (const row of open.data ?? []) {
    const id = (row as { assigned_staff_id: string | null }).assigned_staff_id;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...pool].sort(
    (a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0)
  )[0];
}

export async function sbCreateComplaint(input: {
  me: Profile;
  title: string;
  description: string;
  issue_type: IssueType;
  is_urgent: boolean;
  photo_url?: string | null;
  manual_priority?: Priority | null;
  student_id?: string | null;
}): Promise<{ error?: string; ticket_id?: string }> {
  const studentId =
    input.me.role === "student" ? input.me.id : input.student_id || input.me.id;
  if ((input.me.role === "staff" || input.me.role === "admin") && !input.student_id) {
    return { error: "Select the student you are logging this for." };
  }
  try {
  const rules = await sbListSlaRules();
  const tri = triageIssue(
    input.issue_type,
    input.description,
    input.title,
    input.manual_priority
  );
  const rule = matchSlaRule(rules, tri.category, tri.priority);
  const now = new Date();
  const staff = await leastBusy(tri.category);
  const insert: Record<string, unknown> = {
    student_id: studentId,
    title: input.title.trim(),
    description: input.description.trim(),
    issue_type: input.issue_type,
    category: tri.category,
    priority: tri.priority,
    status: staff ? "assigned" : "registered",
    assigned_staff_id: staff?.id ?? null,
    is_urgent: input.is_urgent,
    photo_url: input.photo_url ?? null,
    sla_deadline: computeDeadline(now, rule).toISOString(),
    assigned_at: staff ? now.toISOString() : null,
    logged_by: input.me.id,
  };
  let { data, error } = await db()
    .from("complaints")
    .insert(insert)
    .select("*")
    .single();
  if (error) {
    const y = new Date().getFullYear();
    insert.ticket_id = `${TICKET_PREFIX}-${y}-${String(Date.now()).slice(-5)}`;
    const retry = await db().from("complaints").insert(insert).select("*").single();
    data = retry.data;
    error = retry.error;
  }
  if (error) return { error: error.message };
  const c = data as Complaint;
  const followUp: Promise<unknown>[] = [
    sbEvent(
      c.id,
      input.me.id,
      "registered",
      input.me.role === "student"
        ? "Logged via student portal"
        : `Walk-in / call logged by ${input.me.full_name}`
    ),
    sbNotify(studentId, "Complaint registered", `${c.ticket_id} created`, c.id),
  ];
  if (input.is_urgent) {
    followUp.push(
      sbEvent(
        c.id,
        input.me.id,
        "flagged_urgent",
        "Flagged urgent — visible in SC grievance queue"
      )
    );
  }
  if (staff) {
    followUp.push(
      sbEvent(
        c.id,
        input.me.id,
        "assigned",
        `Auto-assigned to ${staff.full_name} (${tri.category}, least busy)`
      ),
      sbNotify(
        staff.id,
        "New job assigned",
        `${c.ticket_id} · acknowledge within 15 minutes`,
        c.id
      )
    );
  }
  await Promise.all(followUp);
  if (input.is_urgent) {
    const sc = (await sbListProfiles()).filter((p) => p.role === "sc");
    await Promise.all(
      sc.map((p) =>
        sbNotify(p.id, "Urgent complaint", `${c.ticket_id}: ${c.title}`, c.id)
      )
    );
  }
  return { ticket_id: c.ticket_id };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not save the ticket to the database.";
    console.error("[create complaint]", e);
    return { error: message };
  }
}

export async function sbPatchComplaint(
  id: string,
  patch: Record<string, unknown>
) {
  const { error } = await db().from("complaints").update(patch).eq("id", id);
  if (error) throw error;
}

export async function sbAddEvent(
  complaintId: string,
  actorId: string | null,
  eventType: string,
  note?: string
) {
  await sbEvent(complaintId, actorId, eventType, note);
}

export async function sbNotifyUsers(
  userIds: string[],
  title: string,
  body: string,
  complaintId: string
) {
  for (const id of userIds) {
    await sbNotify(id, title, body, complaintId);
  }
}

export async function sbUpdateSlaRule(input: {
  id: string;
  response_minutes: number;
  resolution_hours: number;
}) {
  const { error } = await db()
    .from("sla_rules")
    .update({
      response_minutes: input.response_minutes,
      resolution_hours: input.resolution_hours,
    })
    .eq("id", input.id);
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function sbUpdateVendor(input: {
  id: string;
  available: boolean;
  notes?: string;
}) {
  const { error } = await db()
    .from("vendors")
    .update({
      available: input.available,
      notes: input.notes,
    })
    .eq("id", input.id);
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function sbRemoveRegisteredUser(id: string): Promise<{ error?: string }> {
  const client = db();
  const { data: owned } = await client
    .from("complaints")
    .select("id")
    .eq("student_id", id);
  const ownedIds = (owned ?? []).map((r) => (r as { id: string }).id);
  await client.from("notifications").delete().eq("user_id", id);
  if (ownedIds.length) {
    await client.from("notifications").delete().in("complaint_id", ownedIds);
    await client.from("complaint_events").delete().in("complaint_id", ownedIds);
    await client.from("complaints").delete().in("id", ownedIds);
  }
  await client.from("complaint_events").update({ actor_id: null }).eq("actor_id", id);
  await client.from("complaints").update({ assigned_staff_id: null }).eq("assigned_staff_id", id);
  await client.from("complaints").update({ logged_by: null }).eq("logged_by", id);
  const { error: profileError } = await client.from("profiles").delete().eq("id", id);
  if (profileError) return { error: profileError.message };
  const { error: authError } = await client.auth.admin.deleteUser(id);
  if (authError && !/not found|user not found/i.test(authError.message)) {
    return { error: authError.message };
  }
  return {};
}

export async function sbGetRawComplaint(id: string): Promise<Complaint | null> {
  const { data, error } = await db()
    .from("complaints")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Complaint) ?? null;
}

export type { ComplaintStatus };
