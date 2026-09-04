-- Hostel Maintenance Complaint Management System
-- Schema, enums, RLS, SLA seed, ticket sequence

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type user_role as enum ('student', 'staff', 'sc', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type staff_category as enum ('electrical', 'plumbing', 'furniture', 'locks', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type priority_tier as enum ('P1', 'P2', 'P3');
exception when duplicate_object then null; end $$;

do $$ begin
  create type complaint_status as enum (
    'registered',
    'assigned',
    'in_progress',
    'material_requested',
    'pending_confirmation',
    'resolved',
    'reopened',
    'escalated'
  );
exception when duplicate_object then null; end $$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'student',
  category staff_category,
  hostel_block text,
  room_number text,
  created_at timestamptz not null default now()
);

-- SLA rules (editable by Admin — not hardcoded in application logic)
create table if not exists public.sla_rules (
  id uuid primary key default gen_random_uuid(),
  category staff_category not null,
  priority priority_tier not null,
  response_minutes integer not null check (response_minutes > 0),
  resolution_hours integer not null check (resolution_hours > 0),
  issue_label text,
  unique (category, priority)
);

-- Vendors (Admin staff/vendor management)
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty staff_category not null,
  contact text,
  available boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- Ticket sequence for human-readable IDs: HMP-YYYY-NNNNN
create table if not exists public.ticket_counters (
  year integer primary key,
  last_value integer not null default 0
);

create or replace function public.next_ticket_id()
returns text
language plpgsql
as $$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  insert into public.ticket_counters (year, last_value)
  values (y, 1)
  on conflict (year) do update
    set last_value = public.ticket_counters.last_value + 1
  returning last_value into n;
  return 'HMP-' || y::text || '-' || lpad(n::text, 5, '0');
end;
$$;

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  ticket_id text unique not null default public.next_ticket_id(),
  student_id uuid not null references public.profiles (id),
  title text not null,
  description text not null,
  issue_type text not null,
  category staff_category not null,
  priority priority_tier not null,
  status complaint_status not null default 'registered',
  assigned_staff_id uuid references public.profiles (id),
  is_urgent boolean not null default false,
  further_escalation boolean not null default false,
  vendor_unavailable boolean not null default false,
  photo_url text,
  completion_photo_url text,
  sla_deadline timestamptz not null,
  assigned_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  logged_by uuid references public.profiles (id)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists complaints_updated_at on public.complaints;
create trigger complaints_updated_at
  before update on public.complaints
  for each row execute function public.set_updated_at();

-- Audit trail / timeline
create table if not exists public.complaint_events (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  event_type text not null,
  note text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- In-app notifications (bell badge)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  complaint_id uuid references public.complaints (id) on delete cascade,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists complaints_student_idx on public.complaints (student_id);
create index if not exists complaints_staff_idx on public.complaints (assigned_staff_id);
create index if not exists complaints_status_idx on public.complaints (status);
create index if not exists complaints_urgent_idx on public.complaints (is_urgent);
create index if not exists events_complaint_idx on public.complaint_events (complaint_id, created_at);
create index if not exists notifications_user_idx on public.notifications (user_id, read);

-- New profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed SLA matrix (Admin-editable)
insert into public.sla_rules (category, priority, response_minutes, resolution_hours, issue_label)
values
  ('plumbing',   'P1', 60,  12, 'Water leak / flooding'),
  ('electrical', 'P1', 60,  12, 'Power failure'),
  ('locks',      'P1', 60,  12, 'Lock breakdown'),
  ('electrical', 'P2', 240, 48, 'Electrical fittings / fan / light'),
  ('plumbing',   'P2', 240, 48, 'Plumbing repairs'),
  ('furniture',  'P3', 480, 72, 'Carpentry / furniture'),
  ('other',      'P3', 480, 72, 'Paint touch-up / other minor'),
  ('locks',      'P2', 240, 48, 'Non-emergency lock adjustment'),
  ('furniture',  'P2', 240, 48, 'Urgent furniture hazard'),
  ('other',      'P2', 240, 48, 'Standard other')
on conflict (category, priority) do nothing;

insert into public.vendors (name, specialty, contact, available, notes)
values
  ('Campus Electricals Co.', 'electrical', 'ext. 4401', true, 'On-call electrician'),
  ('AquaFix Plumbing', 'plumbing', 'ext. 4402', true, 'Leak response'),
  ('Woodwright Carpentry', 'furniture', 'ext. 4403', true, null),
  ('SecureLock Services', 'locks', 'ext. 4404', false, 'Vendor unavailable this week')
on conflict do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.sla_rules enable row level security;
alter table public.complaints enable row level security;
alter table public.complaint_events enable row level security;
alter table public.notifications enable row level security;
alter table public.vendors enable row level security;
alter table public.ticket_counters enable row level security;

-- Helper
create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

-- Profiles
create policy "profiles_select_own_or_staff"
  on public.profiles for select
  using (
    id = auth.uid()
    or (select role from public.profiles where id = auth.uid()) in ('staff', 'sc', 'admin')
  );

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

create policy "profiles_admin_all"
  on public.profiles for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- SLA rules: readable by authenticated, writable by admin
create policy "sla_select_auth"
  on public.sla_rules for select
  to authenticated
  using (true);

create policy "sla_admin_write"
  on public.sla_rules for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Vendors
create policy "vendors_select_staff_admin"
  on public.vendors for select
  using ((select role from public.profiles where id = auth.uid()) in ('staff', 'sc', 'admin'));

create policy "vendors_admin_write"
  on public.vendors for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Complaints SELECT
create policy "complaints_student_select"
  on public.complaints for select
  using (student_id = auth.uid());

create policy "complaints_staff_select"
  on public.complaints for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'staff'
    and (
      assigned_staff_id = auth.uid()
      or category = (select category from public.profiles where id = auth.uid())
    )
  );

create policy "complaints_sc_select"
  on public.complaints for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'sc'
    and (is_urgent = true or status = 'escalated')
  );

create policy "complaints_admin_select"
  on public.complaints for select
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- INSERT: students own tickets; staff (registration desk) on behalf of students
create policy "complaints_student_insert"
  on public.complaints for insert
  with check (
    student_id = auth.uid()
    and (select role from public.profiles where id = auth.uid()) = 'student'
  );

create policy "complaints_staff_insert"
  on public.complaints for insert
  with check (
    (select role from public.profiles where id = auth.uid()) in ('staff', 'admin')
  );

-- UPDATE: students confirm/reopen only
create policy "complaints_student_update"
  on public.complaints for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "complaints_staff_update"
  on public.complaints for update
  using (
    (select role from public.profiles where id = auth.uid()) = 'staff'
    and (
      assigned_staff_id = auth.uid()
      or category = (select category from public.profiles where id = auth.uid())
    )
  );

create policy "complaints_sc_update"
  on public.complaints for update
  using (
    (select role from public.profiles where id = auth.uid()) = 'sc'
    and (is_urgent = true or status = 'escalated')
  );

create policy "complaints_admin_update"
  on public.complaints for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Events
create policy "events_select_related"
  on public.complaint_events for select
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_id
    )
  );

create policy "events_insert_auth"
  on public.complaint_events for insert
  with check (actor_id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'admin');

-- Notifications
create policy "notifications_own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "notifications_insert_staff"
  on public.notifications for insert
  with check (
    (select role from public.profiles where id = auth.uid()) in ('staff', 'sc', 'admin')
    or user_id = auth.uid()
  );

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.complaints to authenticated;
grant select, insert on public.complaint_events to authenticated;
grant select, update, insert on public.notifications to authenticated;
grant select on public.sla_rules to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.vendors to authenticated;
grant all on public.sla_rules to authenticated;
grant all on public.vendors to authenticated;

-- Realtime
alter publication supabase_realtime add table public.complaints;
alter publication supabase_realtime add table public.complaint_events;
alter publication supabase_realtime add table public.notifications;
