export type UserRole = "student" | "staff" | "sc" | "admin";
export type StaffCategory =
  | "electrical"
  | "plumbing"
  | "furniture"
  | "locks"
  | "other";
export type Priority = "P1" | "P2" | "P3";
export type ComplaintStatus =
  | "registered"
  | "assigned"
  | "in_progress"
  | "material_requested"
  | "pending_confirmation"
  | "resolved"
  | "reopened"
  | "escalated";

export type IssueType =
  | "room_furniture"
  | "bathroom"
  | "electricity"
  | "fan_light"
  | "locks"
  | "other";

export type SlaTone = "on_track" | "at_risk" | "breached";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  category: StaffCategory | null;
  hostel_block: string | null;
  room_number: string | null;
  created_at: string;
};

export type SlaRule = {
  id: string;
  category: StaffCategory;
  priority: Priority;
  response_minutes: number;
  resolution_hours: number;
  issue_label: string | null;
};

export type Vendor = {
  id: string;
  name: string;
  specialty: StaffCategory;
  contact: string | null;
  available: boolean;
  notes: string | null;
  created_at: string;
};

export type Complaint = {
  id: string;
  ticket_id: string;
  student_id: string;
  title: string;
  description: string;
  issue_type: IssueType;
  category: StaffCategory;
  priority: Priority;
  status: ComplaintStatus;
  assigned_staff_id: string | null;
  is_urgent: boolean;
  further_escalation: boolean;
  vendor_unavailable: boolean;
  photo_url: string | null;
  completion_photo_url: string | null;
  sla_deadline: string;
  assigned_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  logged_by: string | null;
  student?: Profile;
  assigned_staff?: Profile | null;
};

export type ComplaintEvent = {
  id: string;
  complaint_id: string;
  actor_id: string | null;
  event_type: string;
  note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: Profile | null;
};

export type AppNotification = {
  id: string;
  user_id: string;
  complaint_id: string | null;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

export type SessionUser = Profile;
