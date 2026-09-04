import type { IssueType, Priority, StaffCategory } from "./types";

export const APP_NAME = "HZL Desk";
export const APP_FULL_NAME = "Hostel Maintenance Desk";
export const TARGET_RESOLUTION_DAYS = 2;
export const ACKNOWLEDGE_TARGET_MINUTES = 15;

export const ISSUE_TYPES: {
  value: IssueType;
  label: string;
  category: StaffCategory;
  defaultPriority: Priority;
  hint: string;
}[] = [
  {
    value: "room_furniture",
    label: "Room furniture",
    category: "furniture",
    defaultPriority: "P3",
    hint: "Bed, wardrobe, study table, chair",
  },
  {
    value: "bathroom",
    label: "Bathroom",
    category: "plumbing",
    defaultPriority: "P2",
    hint: "Tap, flush, drain, water leak",
  },
  {
    value: "electricity",
    label: "Electricity",
    category: "electrical",
    defaultPriority: "P2",
    hint: "Socket, wiring, power failure",
  },
  {
    value: "fan_light",
    label: "Fan / Light",
    category: "electrical",
    defaultPriority: "P2",
    hint: "Ceiling fan, tube light, switch",
  },
  {
    value: "locks",
    label: "Locks",
    category: "locks",
    defaultPriority: "P1",
    hint: "Door lock, latch, key jammed",
  },
  {
    value: "other",
    label: "Other",
    category: "other",
    defaultPriority: "P3",
    hint: "Paint, pest, anything else",
  },
];

export const CATEGORY_LABELS: Record<StaffCategory, string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  furniture: "Furniture / Carpentry",
  locks: "Locks",
  other: "Other",
};

export const STATUS_LABELS: Record<string, string> = {
  registered: "Registered",
  assigned: "Assigned",
  in_progress: "In Progress",
  material_requested: "Material Requested",
  pending_confirmation: "Pending Confirmation",
  resolved: "Resolved",
  reopened: "Reopened",
  escalated: "Escalated",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  P1: "P1 – Emergency",
  P2: "P2 – Standard",
  P3: "P3 – Minor",
};

export const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  staff: "Maintenance Staff",
  sc: "Student Coordinator",
  admin: "Admin (Chief Warden)",
};

export const SIGNUP_ROLES: {
  id: string;
  label: string;
  hint: string;
  role: "student" | "staff" | "sc";
  category: StaffCategory | null;
}[] = [
  {
    id: "student",
    label: "Student",
    hint: "Log and track room / block complaints",
    role: "student",
    category: null,
  },
  {
    id: "electrical",
    label: "Electrical staff",
    hint: "Power, sockets, fan, lights",
    role: "staff",
    category: "electrical",
  },
  {
    id: "plumbing",
    label: "Plumbing staff",
    hint: "Water leak, bathroom, taps",
    role: "staff",
    category: "plumbing",
  },
  {
    id: "furniture",
    label: "Furniture / carpentry",
    hint: "Beds, tables, wardrobes",
    role: "staff",
    category: "furniture",
  },
  {
    id: "locks",
    label: "Locks technician",
    hint: "Door locks and latches",
    role: "staff",
    category: "locks",
  },
  {
    id: "desk",
    label: "Registration desk",
    hint: "Log walk-in / call complaints",
    role: "staff",
    category: "other",
  },
  {
    id: "sc",
    label: "Student Coordinator",
    hint: "Urgent / grievance queue",
    role: "sc",
    category: null,
  },
];

export const LIFECYCLE_STEPS = [
  { key: "registered", label: "Registered" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
] as const;

export const P1_KEYWORDS = [
  "leak",
  "flood",
  "power failure",
  "no power",
  "blackout",
  "lock breakdown",
  "cannot lock",
  "can't lock",
  "stuck lock",
  "broken lock",
  "sparking",
  "fire",
  "shock",
];
