import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { ACKNOWLEDGE_TARGET_MINUTES, ISSUE_TYPES, TICKET_PREFIX } from "@/lib/constants";
import { computeDeadline, matchSlaRule, triageIssue } from "@/lib/sla";
import type {
  AppNotification,
  Complaint,
  ComplaintEvent,
  ComplaintStatus,
  IssueType,
  Profile,
  SessionUser,
  SlaRule,
  StaffCategory,
  UserRole,
  Vendor,
} from "@/lib/types";

const DATA_PATH =
  process.env.VERCEL || process.env.NODE_ENV === "production"
    ? path.join("/tmp", "hzl-demo-store.json")
    : path.join(process.cwd(), ".data", "demo-store.json");

export type DemoStore = {
  profiles: Profile[];
  sla_rules: SlaRule[];
  vendors: Vendor[];
  complaints: Complaint[];
  events: ComplaintEvent[];
  notifications: AppNotification[];
  ticket_seq: number;
  year: number;
  passwords: Record<string, string>;
};

const DEMO_PASSWORD = "demo123";

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

function daysAgo(d: number): string {
  return hoursAgo(d * 24);
}

function uid(n: string): string {
  return `00000000-0000-4000-8000-${n.padStart(12, "0")}`;
}

function makeSeed(): DemoStore {
  const year = new Date().getFullYear();
  const profiles: Profile[] = [
    {
      id: uid("1"),
      full_name: "Aisha Rahman",
      email: "student@hostel.edu",
      role: "student",
      category: null,
      hostel_block: "B",
      room_number: "214",
      phone: "+91 98765 43210",
      created_at: daysAgo(40),
    },
    {
      id: uid("2"),
      full_name: "Rohit Mehta",
      email: "student2@hostel.edu",
      role: "student",
      category: null,
      hostel_block: "A",
      room_number: "108",
      phone: "+91 91234 56780",
      created_at: daysAgo(50),
    },
    {
      id: uid("11"),
      full_name: "Karan Electrical",
      email: "electrical@hostel.edu",
      role: "staff",
      category: "electrical",
      hostel_block: null,
      room_number: null,
      phone: "+91 98111 10001",
      created_at: daysAgo(200),
    },
    {
      id: uid("12"),
      full_name: "Priya Electrical",
      email: "electrical2@hostel.edu",
      role: "staff",
      category: "electrical",
      hostel_block: null,
      room_number: null,
      phone: "+91 98111 10002",
      created_at: daysAgo(180),
    },
    {
      id: uid("13"),
      full_name: "Sanjay Plumbing",
      email: "plumbing@hostel.edu",
      role: "staff",
      category: "plumbing",
      hostel_block: null,
      room_number: null,
      phone: "+91 98111 10003",
      created_at: daysAgo(190),
    },
    {
      id: uid("14"),
      full_name: "Neha Carpentry",
      email: "furniture@hostel.edu",
      role: "staff",
      category: "furniture",
      hostel_block: null,
      room_number: null,
      phone: "+91 98111 10004",
      created_at: daysAgo(170),
    },
    {
      id: uid("15"),
      full_name: "Imran Locks",
      email: "locks@hostel.edu",
      role: "staff",
      category: "locks",
      hostel_block: null,
      room_number: null,
      phone: "+91 98111 10005",
      created_at: daysAgo(160),
    },
    {
      id: uid("16"),
      full_name: "Desk Officer Maya",
      email: "desk@hostel.edu",
      role: "staff",
      category: "other",
      hostel_block: null,
      room_number: null,
      phone: "+91 98111 10006",
      created_at: daysAgo(150),
    },
    {
      id: uid("21"),
      full_name: "Ananya Shah (Student council member)",
      email: "sc@hostel.edu",
      role: "sc",
      category: null,
      hostel_block: null,
      room_number: null,
      phone: "+91 98111 20001",
      created_at: daysAgo(300),
    },
    {
      id: uid("31"),
      full_name: "Chief Warden Desai",
      email: "admin@hostel.edu",
      role: "admin",
      category: null,
      hostel_block: null,
      room_number: null,
      phone: "+91 98111 30001",
      created_at: daysAgo(400),
    },
  ];

  const sla_rules: SlaRule[] = [
    {
      id: uid("101"),
      category: "plumbing",
      priority: "P1",
      response_minutes: 60,
      resolution_hours: 12,
      issue_label: "Water leak / flooding",
    },
    {
      id: uid("102"),
      category: "electrical",
      priority: "P1",
      response_minutes: 60,
      resolution_hours: 12,
      issue_label: "Power failure",
    },
    {
      id: uid("103"),
      category: "locks",
      priority: "P1",
      response_minutes: 60,
      resolution_hours: 12,
      issue_label: "Lock breakdown",
    },
    {
      id: uid("104"),
      category: "electrical",
      priority: "P2",
      response_minutes: 240,
      resolution_hours: 48,
      issue_label: "Electrical fittings / fan / light",
    },
    {
      id: uid("105"),
      category: "plumbing",
      priority: "P2",
      response_minutes: 240,
      resolution_hours: 48,
      issue_label: "Plumbing repairs",
    },
    {
      id: uid("106"),
      category: "furniture",
      priority: "P3",
      response_minutes: 480,
      resolution_hours: 72,
      issue_label: "Carpentry / furniture",
    },
    {
      id: uid("107"),
      category: "other",
      priority: "P3",
      response_minutes: 480,
      resolution_hours: 72,
      issue_label: "Paint touch-up / other minor",
    },
    {
      id: uid("108"),
      category: "locks",
      priority: "P2",
      response_minutes: 240,
      resolution_hours: 48,
      issue_label: "Non-emergency lock adjustment",
    },
    {
      id: uid("109"),
      category: "furniture",
      priority: "P2",
      response_minutes: 240,
      resolution_hours: 48,
      issue_label: "Urgent furniture hazard",
    },
    {
      id: uid("110"),
      category: "other",
      priority: "P2",
      response_minutes: 240,
      resolution_hours: 48,
      issue_label: "Standard other",
    },
  ];

  const vendors: Vendor[] = [
    {
      id: uid("201"),
      name: "Campus Electricals Co.",
      specialty: "electrical",
      contact: "ext. 4401",
      available: true,
      notes: "On-call electrician",
      created_at: daysAgo(100),
    },
    {
      id: uid("202"),
      name: "AquaFix Plumbing",
      specialty: "plumbing",
      contact: "ext. 4402",
      available: true,
      notes: "Leak response",
      created_at: daysAgo(100),
    },
    {
      id: uid("203"),
      name: "Woodwright Carpentry",
      specialty: "furniture",
      contact: "ext. 4403",
      available: true,
      notes: null,
      created_at: daysAgo(100),
    },
    {
      id: uid("204"),
      name: "SecureLock Services",
      specialty: "locks",
      contact: "ext. 4404",
      available: false,
      notes: "Vendor unavailable this week",
      created_at: daysAgo(100),
    },
  ];

  const complaints: Complaint[] = [];
  const events: ComplaintEvent[] = [];
  const notifications: AppNotification[] = [];

  function addEvent(
    c: Complaint,
    type: string,
    at: string,
    actor: string,
    note?: string
  ) {
    events.push({
      id: randomUUID(),
      complaint_id: c.id,
      actor_id: actor,
      event_type: type,
      note: note ?? null,
      metadata: null,
      created_at: at,
    });
  }

  function addComplaint(partial: Omit<Complaint, "ticket_id"> & { seq: number }) {
    const { seq, ...rest } = partial;
    const c: Complaint = {
      ...rest,
      ticket_id: `${TICKET_PREFIX}-${year}-${String(seq).padStart(5, "0")}`,
    };
    complaints.push(c);
    return c;
  }

  // Historical resolved tickets for KPI (mix of SLA hit/miss, lead times toward 2-day target)
  const history: Array<{
    hoursToAssign: number;
    hoursToResolve: number;
    issue: IssueType;
    student: string;
    staff: string;
    daysAgoStart: number;
    urgent?: boolean;
  }> = [
    { daysAgoStart: 28, hoursToAssign: 0.4, hoursToResolve: 8, issue: "electricity", student: uid("1"), staff: uid("11") },
    { daysAgoStart: 26, hoursToAssign: 1.2, hoursToResolve: 30, issue: "fan_light", student: uid("2"), staff: uid("12") },
    { daysAgoStart: 24, hoursToAssign: 0.3, hoursToResolve: 6, issue: "locks", student: uid("1"), staff: uid("15") },
    { daysAgoStart: 22, hoursToAssign: 2, hoursToResolve: 55, issue: "bathroom", student: uid("2"), staff: uid("13") },
    { daysAgoStart: 20, hoursToAssign: 3, hoursToResolve: 70, issue: "room_furniture", student: uid("1"), staff: uid("14") },
    { daysAgoStart: 18, hoursToAssign: 0.5, hoursToResolve: 20, issue: "electricity", student: uid("2"), staff: uid("11") },
    { daysAgoStart: 16, hoursToAssign: 0.8, hoursToResolve: 14, issue: "bathroom", student: uid("1"), staff: uid("13") },
    { daysAgoStart: 14, hoursToAssign: 1, hoursToResolve: 40, issue: "fan_light", student: uid("2"), staff: uid("12") },
    { daysAgoStart: 12, hoursToAssign: 0.2, hoursToResolve: 10, issue: "locks", student: uid("1"), staff: uid("15") },
    { daysAgoStart: 10, hoursToAssign: 4, hoursToResolve: 90, issue: "room_furniture", student: uid("2"), staff: uid("14") },
    { daysAgoStart: 8, hoursToAssign: 0.6, hoursToResolve: 18, issue: "electricity", student: uid("1"), staff: uid("11") },
    { daysAgoStart: 6, hoursToAssign: 0.4, hoursToResolve: 22, issue: "bathroom", student: uid("2"), staff: uid("13") },
    { daysAgoStart: 5, hoursToAssign: 1.1, hoursToResolve: 36, issue: "other", student: uid("1"), staff: uid("16") },
    { daysAgoStart: 4, hoursToAssign: 0.3, hoursToResolve: 9, issue: "electricity", student: uid("2"), staff: uid("12") },
    { daysAgoStart: 3, hoursToAssign: 0.5, hoursToResolve: 16, issue: "fan_light", student: uid("1"), staff: uid("11") },
  ];

  let seq = 1;
  for (const h of history) {
    const created = new Date(Date.now() - h.daysAgoStart * 86400000);
    const assigned = new Date(created.getTime() + h.hoursToAssign * 3600000);
    const resolved = new Date(created.getTime() + h.hoursToResolve * 3600000);
    const tri = triageIssue(h.issue, "", h.issue);
    const rule = matchSlaRule(sla_rules, tri.category, tri.priority);
    const deadline = computeDeadline(created, rule);
    const titles: Record<IssueType, string> = {
      room_furniture: "Study table drawer jammed",
      bathroom: "Washbasin tap dripping",
      electricity: "Socket not working",
      fan_light: "Tube light flickering",
      locks: "Room latch sticking",
      other: "Wall paint peeling near window",
    };
    const c = addComplaint({
      seq: seq++,
      id: randomUUID(),
      student_id: h.student,
      title: titles[h.issue],
      description: `Logged from block inspection / student portal. Issue type: ${h.issue}.`,
      issue_type: h.issue,
      category: tri.category,
      priority: tri.priority,
      status: "resolved",
      assigned_staff_id: h.staff,
      is_urgent: Boolean(h.urgent),
      further_escalation: false,
      vendor_unavailable: false,
      photo_url: null,
      completion_photo_url: null,
      sla_deadline: deadline.toISOString(),
      assigned_at: assigned.toISOString(),
      acknowledged_at: new Date(assigned.getTime() + 6 * 60000).toISOString(),
      created_at: created.toISOString(),
      updated_at: resolved.toISOString(),
      resolved_at: resolved.toISOString(),
      logged_by: h.student,
    });
    addEvent(c, "registered", c.created_at, h.student, "Complaint logged");
    addEvent(c, "assigned", c.assigned_at!, h.staff, "Auto-assigned (least busy)");
    addEvent(c, "acknowledged", c.acknowledged_at!, h.staff, "Job acknowledged");
    addEvent(c, "in_progress", new Date(assigned.getTime() + 20 * 60000).toISOString(), h.staff, "Inspection started");
    addEvent(c, "pending_confirmation", new Date(resolved.getTime() - 30 * 60000).toISOString(), h.staff, "Work completed");
    addEvent(c, "resolved", c.resolved_at!, h.student, "Student confirmed resolved");
  }

  // Live open tickets
  const live: Array<Partial<Complaint> & { issue: IssueType; seq?: number; createdHoursAgo: number; status: ComplaintStatus; staff?: string; urgent?: boolean; further?: boolean; material?: boolean }> = [
    {
      issue: "electricity",
      createdHoursAgo: 0.4,
      status: "assigned",
      staff: uid("11"),
      title: "Power failure in Block B corridor",
      description: "Entire corridor of Block B first floor has no power. Emergency — students cannot study.",
      urgent: true,
    },
    {
      issue: "bathroom",
      createdHoursAgo: 2,
      status: "in_progress",
      staff: uid("13"),
      title: "Water leak under washbasin — Room B214",
      description: "Continuous water leak from the PVC joint. Floor is wet and slipping hazard.",
      urgent: true,
    },
    {
      issue: "fan_light",
      createdHoursAgo: 6,
      status: "assigned",
      staff: uid("12"),
      title: "Ceiling fan making grinding noise",
      description: "Fan in A108 started grinding last night. Still runs but noisy.",
    },
    {
      issue: "room_furniture",
      createdHoursAgo: 20,
      status: "material_requested",
      staff: uid("14"),
      material: true,
      title: "Wardrobe hinge broken",
      description: "Right wardrobe door hangs off. Needs replacement hinge (not in stock).",
    },
    {
      issue: "locks",
      createdHoursAgo: 1.2,
      status: "assigned",
      staff: uid("15"),
      title: "Cannot lock room door after 10pm",
      description: "Lock breakdown — cylinder spins freely. Security risk.",
      urgent: true,
    },
    {
      issue: "other",
      createdHoursAgo: 30,
      status: "escalated",
      staff: uid("16"),
      urgent: true,
      further: false,
      title: "Persistent pest issue in pantry",
      description: "Raised twice last week. Still unresolved after vendor visit.",
    },
    {
      issue: "bathroom",
      createdHoursAgo: 50,
      status: "pending_confirmation",
      staff: uid("13"),
      title: "Flush not completing cycle",
      description: "Cistern fills but flush is weak. Staff replaced washer.",
    },
    {
      issue: "electricity",
      createdHoursAgo: 72,
      status: "reopened",
      staff: uid("11"),
      title: "Study lamp socket dead again",
      description: "Marked resolved yesterday but socket failed again this morning.",
    },
  ];

  for (const L of live) {
    const created = new Date(Date.now() - L.createdHoursAgo * 3600000);
    const tri = triageIssue(L.issue, L.description ?? "", L.title ?? L.issue);
    const rule = matchSlaRule(sla_rules, tri.category, tri.priority);
    const student = L.issue === "fan_light" ? uid("2") : uid("1");
    const assignedAt = L.staff
      ? new Date(created.getTime() + 8 * 60000)
      : null;
    const c = addComplaint({
      seq: seq++,
      id: randomUUID(),
      student_id: student,
      title: L.title ?? L.issue,
      description: L.description ?? "",
      issue_type: L.issue,
      category: tri.category,
      priority: tri.priority,
      status: L.status,
      assigned_staff_id: L.staff ?? null,
      is_urgent: Boolean(L.urgent),
      further_escalation: Boolean(L.further),
      vendor_unavailable: false,
      photo_url: null,
      completion_photo_url:
        L.status === "pending_confirmation"
          ? "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800"
          : null,
      sla_deadline: computeDeadline(created, rule).toISOString(),
      assigned_at: assignedAt?.toISOString() ?? null,
      acknowledged_at:
        L.status === "in_progress" ||
        L.status === "material_requested" ||
        L.status === "pending_confirmation"
          ? new Date(created.getTime() + 15 * 60000).toISOString()
          : null,
      created_at: created.toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      logged_by: student,
    });
    addEvent(c, "registered", c.created_at, student, "Complaint logged via ERP portal");
    if (L.urgent) addEvent(c, "flagged_urgent", c.created_at, student, "Student flagged as urgent");
    if (c.assigned_staff_id && c.assigned_at) {
      addEvent(c, "assigned", c.assigned_at, c.assigned_staff_id, "Auto-assigned to matching staff");
    }
    if (c.status === "in_progress") {
      addEvent(c, "in_progress", hoursAgo(L.createdHoursAgo - 0.3), c.assigned_staff_id!, "Arrived for inspection");
    }
    if (c.status === "material_requested") {
      addEvent(c, "in_progress", hoursAgo(L.createdHoursAgo - 2), c.assigned_staff_id!, "Inspected on site");
      addEvent(c, "material_requested", hoursAgo(1), c.assigned_staff_id!, "Hinge SKU H-40 required. Flagged for Admin.");
    }
    if (c.status === "pending_confirmation") {
      addEvent(c, "pending_confirmation", hoursAgo(2), c.assigned_staff_id!, "Washer replaced. Please confirm.");
    }
    if (c.status === "escalated") {
      addEvent(c, "escalated", hoursAgo(4), uid("21"), "Student council member escalated to Admin — vendor visit did not close the issue.");
    }
    if (c.status === "reopened") {
      addEvent(c, "resolved", hoursAgo(20), student, "Previously confirmed");
      addEvent(c, "reopened", hoursAgo(3), student, "Not resolved — socket failed again");
    }
    if (L.urgent) {
      notifications.push({
        id: randomUUID(),
        user_id: uid("21"),
        complaint_id: c.id,
        title: "Urgent ticket in grievance queue",
        body: c.ticket_id,
        read: false,
        created_at: c.created_at,
      });
    }
  }

  return {
    profiles: profiles.map((p) => ({ ...p, approved: true })),
    sla_rules,
    vendors,
    complaints,
    events,
    notifications,
    ticket_seq: seq - 1,
    year,
    passwords: {},
  };
}

let cache: DemoStore | null = null;

function load(): DemoStore {
  if (cache) return cache;
  try {
    if (existsSync(DATA_PATH)) {
      cache = JSON.parse(readFileSync(DATA_PATH, "utf8")) as DemoStore;
      cache.passwords = cache.passwords ?? {};
      cache.profiles = cache.profiles.map((p) => ({
        ...p,
        approved: p.approved !== false,
      }));
      return cache;
    }
  } catch {
    /* seed */
  }
  cache = makeSeed();
  persist();
  return cache;
}

function persist() {
  if (!cache) return;
  mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(cache, null, 2));
}

export function getStore(): DemoStore {
  return load();
}

export function saveStore() {
  persist();
}

export function resetStore() {
  cache = makeSeed();
  persist();
  return cache;
}

export function demoPassword() {
  return DEMO_PASSWORD;
}

export function hydrateComplaint(c: Complaint): Complaint {
  const s = load();
  const student = s.profiles.find((p) => p.id === c.student_id);
  const staff = c.assigned_staff_id
    ? s.profiles.find((p) => p.id === c.assigned_staff_id)
    : null;
  return { ...c, student, assigned_staff: staff ?? null };
}

export function nextTicketId(): string {
  const s = load();
  s.ticket_seq += 1;
  return `${TICKET_PREFIX}-${s.year}-${String(s.ticket_seq).padStart(5, "0")}`;
}

export function leastBusyStaff(category: StaffCategory): Profile | undefined {
  const s = load();
  const staff = s.profiles.filter(
    (p) => p.role === "staff" && p.category === category
  );
  if (!staff.length) return undefined;
  const open = (id: string) =>
    s.complaints.filter(
      (c) =>
        c.assigned_staff_id === id &&
        !["resolved"].includes(c.status)
    ).length;
  return [...staff].sort((a, b) => open(a.id) - open(b.id))[0];
}

export function notify(
  userId: string,
  title: string,
  body: string,
  complaintId: string | null
) {
  const s = load();
  s.notifications.unshift({
    id: randomUUID(),
    user_id: userId,
    complaint_id: complaintId,
    title,
    body,
    read: false,
    created_at: new Date().toISOString(),
  });
}

export function addEvent(
  complaintId: string,
  actorId: string | null,
  eventType: string,
  note?: string,
  metadata?: Record<string, unknown>
) {
  const s = load();
  s.events.push({
    id: randomUUID(),
    complaint_id: complaintId,
    actor_id: actorId,
    event_type: eventType,
    note: note ?? null,
    metadata: metadata ?? null,
    created_at: new Date().toISOString(),
  });
}

export function findUserByEmail(email: string): Profile | undefined {
  return load().profiles.find(
    (p) => p.email.toLowerCase() === email.toLowerCase()
  );
}

export function checkDemoPassword(email: string, password: string): boolean {
  const s = load();
  const stored = s.passwords[email.toLowerCase()];
  if (stored) return stored === password;
  if (findUserByEmail(email)) {
    return password === DEMO_PASSWORD || password === "demo";
  }
  return false;
}

export function createAccount(input: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  category: StaffCategory | null;
  hostel_block?: string;
  room_number?: string;
}): Profile {
  const s = load();
  const p: Profile = {
    id: randomUUID(),
    full_name: input.full_name,
    email: input.email,
    role: input.role,
    category: input.category,
    hostel_block: input.hostel_block ?? null,
    room_number: input.room_number ?? null,
    phone: input.phone ?? null,
    created_at: new Date().toISOString(),
    approved: false,
  };
  s.profiles.push(p);
  s.passwords[input.email.toLowerCase()] = input.password;
  persist();
  return p;
}

export function setApproved(id: string, approved: boolean) {
  const p = load().profiles.find((x) => x.id === id);
  if (p) p.approved = approved;
  persist();
}

export function removeAccount(id: string) {
  const s = load();
  const theirs = s.complaints.filter((c) => c.student_id === id).map((c) => c.id);
  s.complaints = s.complaints.filter((c) => c.student_id !== id);
  for (const c of s.complaints) {
    if (c.assigned_staff_id === id) c.assigned_staff_id = null;
    if (c.logged_by === id) c.logged_by = null;
  }
  s.events = s.events.filter(
    (e) => !theirs.includes(e.complaint_id)
  );
  for (const e of s.events) {
    if (e.actor_id === id) e.actor_id = null;
  }
  s.notifications = s.notifications.filter(
    (n) => n.user_id !== id && (!n.complaint_id || !theirs.includes(n.complaint_id))
  );
  const gone = s.profiles.find((p) => p.id === id);
  s.profiles = s.profiles.filter((p) => p.id !== id);
  if (gone) delete s.passwords[gone.email.toLowerCase()];
  persist();
}

export function createStudent(input: {
  full_name: string;
  email: string;
  hostel_block?: string;
  room_number?: string;
}): Profile {
  return createAccount({
    ...input,
    password: DEMO_PASSWORD,
    role: "student",
    category: null,
  });
}

export { ACKNOWLEDGE_TARGET_MINUTES, ISSUE_TYPES };
export type { UserRole, SessionUser };
