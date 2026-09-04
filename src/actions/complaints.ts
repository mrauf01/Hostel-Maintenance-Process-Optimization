"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/actions/auth";
import {
  addEvent,
  getStore,
  hydrateComplaint,
  leastBusyStaff,
  nextTicketId,
  notify,
  saveStore,
} from "@/lib/demo/store";
import { computeDeadline, matchSlaRule, triageIssue } from "@/lib/sla";
import { isDemoMode, isSupabaseConfigured } from "@/lib/mode";
import type {
  Complaint,
  ComplaintEvent,
  ComplaintStatus,
  IssueType,
  Priority,
  Profile,
  SlaRule,
  StaffCategory,
  Vendor,
  AppNotification,
} from "@/lib/types";

function touchPaths(ticketId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/sc");
  revalidatePath("/dashboard/admin");
  revalidatePath("/complaints/new");
  if (ticketId) revalidatePath(`/complaints/${ticketId}`);
}

function liveDb() {
  return !isDemoMode() && isSupabaseConfigured();
}

export async function listComplaintsForUser(): Promise<Complaint[]> {
  const me = await getCurrentProfile();
  if (!me) return [];
  if (liveDb()) {
    try {
      const { sbListComplaints } = await import("@/lib/supabase/data");
      return filterByRole(await sbListComplaints(), me);
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  const all = getStore().complaints.map(hydrateComplaint);
  return filterByRole(all, me);
}

export async function listComplaintEvents(): Promise<ComplaintEvent[]> {
  if (liveDb()) {
    try {
      const { sbListEvents } = await import("@/lib/supabase/data");
      return sbListEvents();
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  return getStore().events;
}

function filterByRole(all: Complaint[], me: Profile): Complaint[] {
  if (me.role === "admin") return all;
  if (me.role === "student") return all.filter((c) => c.student_id === me.id);
  if (me.role === "sc")
    return all.filter((c) => c.is_urgent || c.status === "escalated");
  if (me.role === "staff")
    return all.filter(
      (c) =>
        c.assigned_staff_id === me.id ||
        c.category === me.category ||
        (me.category === "other" && !c.assigned_staff_id)
    );
  return [];
}

export async function getComplaintByTicket(
  ticketId: string
): Promise<{ complaint: Complaint; events: ComplaintEvent[] } | null> {
  const me = await getCurrentProfile();
  if (!me) return null;
  if (liveDb()) {
    try {
      const { sbGetComplaint } = await import("@/lib/supabase/data");
      const found = await sbGetComplaint(ticketId);
      if (!found) return null;
      if (!filterByRole([found.complaint], me).length) return null;
      return found;
    } catch (e) {
      console.error(e);
      return null;
    }
  }
  const s = getStore();
  const raw = s.complaints.find(
    (c) => c.ticket_id === ticketId || c.id === ticketId
  );
  if (!raw) return null;
  const complaint = hydrateComplaint(raw);
  const allowed = filterByRole([complaint], me);
  if (!allowed.length) return null;
  const events = s.events
    .filter((e) => e.complaint_id === complaint.id)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    .map((e) => ({
      ...e,
      actor: s.profiles.find((p) => p.id === e.actor_id) ?? null,
    }));
  return { complaint, events };
}

export async function listSlaRules(): Promise<SlaRule[]> {
  if (liveDb()) {
    try {
      const { sbListSlaRules } = await import("@/lib/supabase/data");
      return await sbListSlaRules();
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  return getStore().sla_rules;
}

export async function listStaff(): Promise<Profile[]> {
  if (liveDb()) {
    try {
      const { sbListStaff } = await import("@/lib/supabase/data");
      return await sbListStaff();
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  return getStore().profiles.filter((p) => p.role === "staff");
}

export async function listVendors(): Promise<Vendor[]> {
  if (liveDb()) {
    try {
      const { sbListVendors } = await import("@/lib/supabase/data");
      return await sbListVendors();
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  return getStore().vendors;
}

export async function listProfiles(): Promise<Profile[]> {
  const me = await getCurrentProfile();
  if (!me) return [];
  if (liveDb()) {
    try {
      const { sbListProfiles } = await import("@/lib/supabase/data");
      const all = await sbListProfiles();
      if (me.role === "admin" || me.role === "staff" || me.role === "sc") return all;
      return [me];
    } catch (e) {
      console.error(e);
      return [me];
    }
  }
  if (me.role === "admin" || me.role === "staff" || me.role === "sc") {
    return getStore().profiles;
  }
  return [me];
}

export async function listNotifications(): Promise<AppNotification[]> {
  const me = await getCurrentProfile();
  if (!me) return [];
  if (liveDb()) {
    try {
      const { sbListNotifications } = await import("@/lib/supabase/data");
      return await sbListNotifications(me.id);
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  return getStore()
    .notifications.filter((n) => n.user_id === me.id)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export async function markNotificationsRead() {
  const me = await getCurrentProfile();
  if (!me) return;
  if (liveDb()) {
    const { sbMarkNotificationsRead } = await import("@/lib/supabase/data");
    await sbMarkNotificationsRead(me.id);
    touchPaths();
    return;
  }
  getStore().notifications.forEach((n) => {
    if (n.user_id === me.id) n.read = true;
  });
  saveStore();
  touchPaths();
}

export async function createComplaint(input: {
  title: string;
  description: string;
  issue_type: IssueType;
  is_urgent: boolean;
  photo_url?: string | null;
  manual_priority?: Priority | null;
  student_id?: string | null;
}): Promise<{ error?: string; ticket_id?: string }> {
  const me = await getCurrentProfile();
  if (!me) return { error: "Sign in required." };
  if (!input.title.trim() || input.title.trim().length < 8) {
    return { error: "Give a short title (at least 8 characters)." };
  }
  if (!input.description.trim() || input.description.trim().length < 20) {
    return { error: "Describe the issue in at least 20 characters." };
  }

  const studentId =
    me.role === "student" ? me.id : input.student_id || me.id;
  if (me.role === "staff" && !input.student_id) {
    return { error: "Select the student you are logging this for." };
  }

  if (liveDb()) {
    const { sbCreateComplaint } = await import("@/lib/supabase/data");
    const res = await sbCreateComplaint({ me, ...input });
    if (res.ticket_id) touchPaths(res.ticket_id);
    return res;
  }

  const s = getStore();
  const tri = triageIssue(
    input.issue_type,
    input.description,
    input.title,
    input.manual_priority
  );
  const rule = matchSlaRule(s.sla_rules, tri.category, tri.priority);
  const now = new Date();
  const staff = leastBusyStaff(tri.category);
  const id = randomUUID();
  const ticket_id = nextTicketId();
  const complaint: Complaint = {
    id,
    ticket_id,
    student_id: studentId,
    title: input.title.trim(),
    description: input.description.trim(),
    issue_type: input.issue_type,
    category: tri.category,
    priority: tri.priority,
    status: staff ? "assigned" : "registered",
    assigned_staff_id: staff?.id ?? null,
    is_urgent: input.is_urgent,
    further_escalation: false,
    vendor_unavailable: false,
    photo_url: input.photo_url ?? null,
    completion_photo_url: null,
    sla_deadline: computeDeadline(now, rule).toISOString(),
    assigned_at: staff ? now.toISOString() : null,
    acknowledged_at: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    resolved_at: null,
    logged_by: me.id,
  };
  s.complaints.unshift(complaint);
  addEvent(
    id,
    me.id,
    "registered",
    me.role === "student"
      ? "Logged via student portal"
      : `Walk-in / call logged by ${me.full_name}`
  );
  if (input.is_urgent) {
    addEvent(id, me.id, "flagged_urgent", "Flagged urgent — visible in SC grievance queue");
    s.profiles
      .filter((p) => p.role === "sc")
      .forEach((p) =>
        notify(p.id, "Urgent complaint", `${ticket_id}: ${complaint.title}`, id)
      );
  }
  if (staff) {
    addEvent(
      id,
      me.id,
      "assigned",
      `Auto-assigned to ${staff.full_name} (${tri.category}, least busy)`
    );
    notify(
      staff.id,
      "New job assigned",
      `${ticket_id} · acknowledge within 15 minutes`,
      id
    );
  }
  notify(
    studentId,
    "Complaint registered",
    `${ticket_id} created`,
    id
  );
  saveStore();
  touchPaths(ticket_id);
  return { ticket_id };
}

async function updateComplaintStatusLive(
  me: Profile,
  input: {
    id: string;
    status?: ComplaintStatus;
    note?: string;
    completion_photo_url?: string | null;
    vendor_unavailable?: boolean;
    assigned_staff_id?: string | null;
    is_urgent?: boolean;
    escalate_to_admin?: boolean;
    further_escalation?: boolean;
    confirm?: "resolved" | "not_resolved";
  }
): Promise<{ error?: string; ticket_id?: string }> {
  const {
    sbGetRawComplaint,
    sbPatchComplaint,
    sbAddEvent,
    sbNotifyUsers,
    sbListProfiles,
  } = await import("@/lib/supabase/data");
  const c = await sbGetRawComplaint(input.id);
  if (!c) return { error: "Ticket not found." };
  const now = new Date().toISOString();
  const admins = (await sbListProfiles())
    .filter((p) => p.role === "admin")
    .map((p) => p.id);
  const scs = (await sbListProfiles())
    .filter((p) => p.role === "sc")
    .map((p) => p.id);

  async function done() {
    touchPaths(c!.ticket_id);
    return { ticket_id: c!.ticket_id };
  }

  if (input.confirm === "resolved") {
    if (me.role !== "student" || me.id !== c.student_id) {
      return { error: "Only the student can confirm closure." };
    }
    await sbPatchComplaint(c.id, { status: "resolved", resolved_at: now });
    await sbAddEvent(c.id, me.id, "resolved", "Student confirmed resolved");
    if (c.assigned_staff_id)
      await sbNotifyUsers([c.assigned_staff_id], "Ticket closed", c.ticket_id, c.id);
    await sbNotifyUsers(admins, "Closure confirmed", c.ticket_id, c.id);
    return done();
  }
  if (input.confirm === "not_resolved") {
    if (me.role !== "student" || me.id !== c.student_id) {
      return { error: "Only the student can reopen." };
    }
    await sbPatchComplaint(c.id, { status: "reopened", resolved_at: null });
    await sbAddEvent(c.id, me.id, "reopened", "Student marked not resolved — reopened");
    if (c.assigned_staff_id)
      await sbNotifyUsers(
        [c.assigned_staff_id],
        "Ticket reopened",
        `${c.ticket_id} was not resolved`,
        c.id
      );
    await sbNotifyUsers(admins, "Reopened ticket", c.ticket_id, c.id);
    return done();
  }
  if (input.is_urgent && me.role === "student") {
    await sbPatchComplaint(c.id, { is_urgent: true });
    await sbAddEvent(c.id, me.id, "flagged_urgent", "Student flagged as urgent");
    await sbNotifyUsers(
      scs,
      "Urgent flag",
      `${c.ticket_id} added to grievance queue`,
      c.id
    );
    return done();
  }
  if (input.escalate_to_admin && me.role === "sc") {
    await sbPatchComplaint(c.id, { status: "escalated" });
    await sbAddEvent(
      c.id,
      me.id,
      "escalated",
      input.note || "SC escalated to Admin (Chief Warden / Chief Engineer)"
    );
    await sbNotifyUsers(admins, "Escalated to Admin", c.ticket_id, c.id);
    if (c.assigned_staff_id)
      await sbNotifyUsers([c.assigned_staff_id], "Ticket escalated", c.ticket_id, c.id);
    await sbNotifyUsers([c.student_id], "Your ticket was escalated", c.ticket_id, c.id);
    return done();
  }
  if (input.further_escalation && me.role === "admin") {
    await sbPatchComplaint(c.id, {
      further_escalation: true,
      status: "escalated",
    });
    await sbAddEvent(
      c.id,
      me.id,
      "further_escalation",
      input.note ||
        "Admin resolution did not close the ticket — flagged Further Escalation"
    );
    await sbNotifyUsers([c.student_id], "Further escalation", c.ticket_id, c.id);
    return done();
  }
  if (input.assigned_staff_id && (me.role === "admin" || me.role === "staff")) {
    const staff = (await sbListProfiles()).find(
      (p) => p.id === input.assigned_staff_id
    );
    await sbPatchComplaint(c.id, {
      assigned_staff_id: input.assigned_staff_id,
      assigned_at: now,
      acknowledged_at: null,
      status: "assigned",
    });
    await sbAddEvent(
      c.id,
      me.id,
      "assigned",
      `Reassigned to ${staff?.full_name ?? "staff"}`
    );
    await sbNotifyUsers(
      [input.assigned_staff_id],
      "Ticket assigned",
      `${c.ticket_id} · acknowledge within 15 minutes`,
      c.id
    );
    return done();
  }
  if (me.role !== "staff" && me.role !== "admin") {
    return { error: "You cannot update this ticket." };
  }
  if (input.status === "assigned" && !c.acknowledged_at) {
    await sbPatchComplaint(c.id, { acknowledged_at: now });
    await sbAddEvent(c.id, me.id, "acknowledged", "Staff acknowledged the job");
    await sbNotifyUsers(
      [c.student_id],
      "Staff acknowledged your ticket",
      c.ticket_id,
      c.id
    );
    return done();
  }
  if (input.status) {
    const patch: Record<string, unknown> = { status: input.status };
    if (input.status === "in_progress" && !c.acknowledged_at)
      patch.acknowledged_at = now;
    if (input.vendor_unavailable) patch.vendor_unavailable = true;
    if (input.completion_photo_url)
      patch.completion_photo_url = input.completion_photo_url;
    await sbPatchComplaint(c.id, patch);
    await sbAddEvent(
      c.id,
      me.id,
      input.vendor_unavailable ? "vendor_unavailable" : input.status,
      input.note || input.status
    );
    await sbNotifyUsers(
      [c.student_id],
      `Status: ${input.status.replaceAll("_", " ")}`,
      c.ticket_id,
      c.id
    );
    if (input.status === "material_requested" || input.vendor_unavailable) {
      await sbNotifyUsers(
        admins,
        input.vendor_unavailable ? "Vendor unavailable" : "Material requested",
        c.ticket_id,
        c.id
      );
    }
    return done();
  }
  if (input.note) {
    await sbAddEvent(c.id, me.id, "note", input.note);
    return done();
  }
  return { error: "Nothing to update." };
}

export async function updateComplaintStatus(input: {
  id: string;
  status?: ComplaintStatus;
  note?: string;
  completion_photo_url?: string | null;
  vendor_unavailable?: boolean;
  assigned_staff_id?: string | null;
  is_urgent?: boolean;
  escalate_to_admin?: boolean;
  further_escalation?: boolean;
  confirm?: "resolved" | "not_resolved";
}): Promise<{ error?: string; ticket_id?: string }> {
  const me = await getCurrentProfile();
  if (!me) return { error: "Sign in required." };
  if (liveDb()) {
    return updateComplaintStatusLive(me, input);
  }
  const s = getStore();
  const c = s.complaints.find((x) => x.id === input.id);
  if (!c) return { error: "Ticket not found." };

  const now = new Date().toISOString();

  if (input.confirm === "resolved") {
    if (me.role !== "student" || me.id !== c.student_id) {
      return { error: "Only the student can confirm closure." };
    }
    c.status = "resolved";
    c.resolved_at = now;
    c.updated_at = now;
    addEvent(c.id, me.id, "resolved", "Student confirmed resolved");
    if (c.assigned_staff_id)
      notify(c.assigned_staff_id, "Ticket closed", c.ticket_id, c.id);
    s.profiles
      .filter((p) => p.role === "admin")
      .forEach((p) => notify(p.id, "Closure confirmed", c.ticket_id, c.id));
    saveStore();
    touchPaths(c.ticket_id);
    return { ticket_id: c.ticket_id };
  }

  if (input.confirm === "not_resolved") {
    if (me.role !== "student" || me.id !== c.student_id) {
      return { error: "Only the student can reopen." };
    }
    c.status = "reopened";
    c.resolved_at = null;
    c.updated_at = now;
    addEvent(c.id, me.id, "reopened", "Student marked not resolved — reopened");
    if (c.assigned_staff_id)
      notify(
        c.assigned_staff_id,
        "Ticket reopened",
        `${c.ticket_id} was not resolved`,
        c.id
      );
    s.profiles
      .filter((p) => p.role === "admin")
      .forEach((p) =>
        notify(p.id, "Reopened ticket", c.ticket_id, c.id)
      );
    saveStore();
    touchPaths(c.ticket_id);
    return { ticket_id: c.ticket_id };
  }

  if (input.is_urgent && me.role === "student") {
    c.is_urgent = true;
    c.updated_at = now;
    addEvent(c.id, me.id, "flagged_urgent", "Student flagged as urgent");
    s.profiles
      .filter((p) => p.role === "sc")
      .forEach((p) =>
        notify(p.id, "Urgent flag", `${c.ticket_id} added to grievance queue`, c.id)
      );
    saveStore();
    touchPaths(c.ticket_id);
    return { ticket_id: c.ticket_id };
  }

  if (input.escalate_to_admin && me.role === "sc") {
    c.status = "escalated";
    c.updated_at = now;
    addEvent(
      c.id,
      me.id,
      "escalated",
      input.note || "SC escalated to Admin (Chief Warden / Chief Engineer)"
    );
    s.profiles
      .filter((p) => p.role === "admin")
      .forEach((p) =>
        notify(p.id, "Escalated to Admin", c.ticket_id, c.id)
      );
    if (c.assigned_staff_id)
      notify(c.assigned_staff_id, "Ticket escalated", c.ticket_id, c.id);
    notify(c.student_id, "Your ticket was escalated", c.ticket_id, c.id);
    saveStore();
    touchPaths(c.ticket_id);
    return { ticket_id: c.ticket_id };
  }

  if (input.further_escalation && me.role === "admin") {
    c.further_escalation = true;
    c.status = "escalated";
    c.updated_at = now;
    addEvent(
      c.id,
      me.id,
      "further_escalation",
      input.note ||
        "Admin resolution did not close the ticket — flagged Further Escalation"
    );
    notify(c.student_id, "Further escalation", c.ticket_id, c.id);
    saveStore();
    touchPaths(c.ticket_id);
    return { ticket_id: c.ticket_id };
  }

  if (input.assigned_staff_id && (me.role === "admin" || me.role === "staff")) {
    const staff = s.profiles.find((p) => p.id === input.assigned_staff_id);
    c.assigned_staff_id = input.assigned_staff_id;
    c.assigned_at = now;
    c.acknowledged_at = null;
    c.status = "assigned";
    c.updated_at = now;
    addEvent(
      c.id,
      me.id,
      "assigned",
      `Reassigned to ${staff?.full_name ?? "staff"}`
    );
    notify(
      input.assigned_staff_id,
      "Ticket assigned",
      `${c.ticket_id} · acknowledge within 15 minutes`,
      c.id
    );
    saveStore();
    touchPaths(c.ticket_id);
    return { ticket_id: c.ticket_id };
  }

  if (me.role !== "staff" && me.role !== "admin") {
    return { error: "You cannot update this ticket." };
  }

  if (input.status === "assigned" && !c.acknowledged_at) {
    c.acknowledged_at = now;
    c.updated_at = now;
    addEvent(c.id, me.id, "acknowledged", "Staff acknowledged the job");
    notify(c.student_id, "Staff acknowledged your ticket", c.ticket_id, c.id);
    saveStore();
    touchPaths(c.ticket_id);
    return { ticket_id: c.ticket_id };
  }

  if (input.status) {
    c.status = input.status;
    c.updated_at = now;
    if (input.status === "in_progress" && !c.acknowledged_at) {
      c.acknowledged_at = now;
    }
    if (input.vendor_unavailable) c.vendor_unavailable = true;
    if (input.completion_photo_url)
      c.completion_photo_url = input.completion_photo_url;
    if (input.status === "pending_confirmation" && input.completion_photo_url) {
      c.completion_photo_url = input.completion_photo_url;
    }
    const labels: Partial<Record<ComplaintStatus, string>> = {
      in_progress: "Issue inspection — in progress",
      material_requested: "Material / spare parts requested (visible to Admin)",
      pending_confirmation: "Work complete — awaiting student confirmation",
      assigned: "Returned to assigned",
      escalated: "Escalated",
    };
    addEvent(
      c.id,
      me.id,
      input.vendor_unavailable ? "vendor_unavailable" : input.status,
      input.note || labels[input.status] || input.status
    );
    notify(
      c.student_id,
      `Status: ${input.status.replaceAll("_", " ")}`,
      c.ticket_id,
      c.id
    );
    if (
      input.status === "material_requested" ||
      input.vendor_unavailable
    ) {
      s.profiles
        .filter((p) => p.role === "admin")
        .forEach((p) =>
          notify(
            p.id,
            input.vendor_unavailable
              ? "Vendor unavailable"
              : "Material requested",
            c.ticket_id,
            c.id
          )
        );
    }
    saveStore();
    touchPaths(c.ticket_id);
    return { ticket_id: c.ticket_id };
  }

  if (input.note) {
    addEvent(c.id, me.id, "note", input.note);
    c.updated_at = now;
    saveStore();
    touchPaths(c.ticket_id);
    return { ticket_id: c.ticket_id };
  }

  return { error: "Nothing to update." };
}

export async function updateSlaRule(input: {
  id: string;
  response_minutes: number;
  resolution_hours: number;
}) {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") return { error: "Admin only." };
  if (liveDb()) {
    const { sbUpdateSlaRule } = await import("@/lib/supabase/data");
    const res = await sbUpdateSlaRule(input);
    touchPaths();
    return res;
  }
  const rule = getStore().sla_rules.find((r) => r.id === input.id);
  if (!rule) return { error: "Rule not found." };
  rule.response_minutes = input.response_minutes;
  rule.resolution_hours = input.resolution_hours;
  saveStore();
  touchPaths();
  return { ok: true as const };
}

export async function updateVendor(input: {
  id: string;
  available: boolean;
  notes?: string;
}) {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") return { error: "Admin only." };
  if (liveDb()) {
    const { sbUpdateVendor } = await import("@/lib/supabase/data");
    const res = await sbUpdateVendor(input);
    touchPaths();
    return res;
  }
  const v = getStore().vendors.find((x) => x.id === input.id);
  if (!v) return { error: "Vendor not found." };
  v.available = input.available;
  if (input.notes !== undefined) v.notes = input.notes;
  saveStore();
  touchPaths();
  return { ok: true as const };
}

export async function updateStaffProfile(input: {
  id: string;
  category: StaffCategory;
  full_name: string;
}) {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") return { error: "Admin only." };
  const p = getStore().profiles.find((x) => x.id === input.id);
  if (!p) return { error: "Not found." };
  p.category = input.category;
  p.full_name = input.full_name;
  saveStore();
  touchPaths();
  return { ok: true as const };
}

export async function resetDemoData() {
  const { resetStore } = await import("@/lib/demo/store");
  resetStore();
  touchPaths();
  return { ok: true as const };
}
