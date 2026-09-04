-- Idempotent repair:
-- 1) approved column (signups wait for Admin)
-- 2) non-recursive RLS helpers (old policies subquery profiles from profiles)
-- 3) handle_new_user writes role, category, approved

alter table public.profiles
  add column if not exists approved boolean not null default false;

create or replace function public.my_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.my_category()
returns staff_category
language sql
stable
security definer
set search_path = public
as $$
  select category from public.profiles where id = auth.uid()
$$;

grant execute on function public.my_role() to authenticated, anon;
grant execute on function public.my_category() to authenticated, anon;

drop policy if exists "profiles_select_own_or_staff" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;
drop policy if exists "sla_select_auth" on public.sla_rules;
drop policy if exists "sla_admin_write" on public.sla_rules;
drop policy if exists "vendors_select_staff_admin" on public.vendors;
drop policy if exists "vendors_admin_write" on public.vendors;
drop policy if exists "complaints_student_select" on public.complaints;
drop policy if exists "complaints_staff_select" on public.complaints;
drop policy if exists "complaints_sc_select" on public.complaints;
drop policy if exists "complaints_admin_select" on public.complaints;
drop policy if exists "complaints_student_insert" on public.complaints;
drop policy if exists "complaints_staff_insert" on public.complaints;
drop policy if exists "complaints_student_update" on public.complaints;
drop policy if exists "complaints_staff_update" on public.complaints;
drop policy if exists "complaints_sc_update" on public.complaints;
drop policy if exists "complaints_admin_update" on public.complaints;
drop policy if exists "events_select_related" on public.complaint_events;
drop policy if exists "events_insert_auth" on public.complaint_events;
drop policy if exists "notifications_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_insert_staff" on public.notifications;

create policy "profiles_select_own_or_staff"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.my_role() in ('staff', 'sc', 'admin')
  );

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

create policy "profiles_admin_all"
  on public.profiles for all
  using (public.my_role() = 'admin');

create policy "sla_select_auth"
  on public.sla_rules for select
  to authenticated
  using (true);

create policy "sla_admin_write"
  on public.sla_rules for all
  using (public.my_role() = 'admin');

create policy "vendors_select_staff_admin"
  on public.vendors for select
  using (public.my_role() in ('staff', 'sc', 'admin'));

create policy "vendors_admin_write"
  on public.vendors for all
  using (public.my_role() = 'admin');

create policy "complaints_student_select"
  on public.complaints for select
  using (student_id = auth.uid());

create policy "complaints_staff_select"
  on public.complaints for select
  using (
    public.my_role() = 'staff'
    and (
      assigned_staff_id = auth.uid()
      or category = public.my_category()
    )
  );

create policy "complaints_sc_select"
  on public.complaints for select
  using (
    public.my_role() = 'sc'
    and (is_urgent = true or status = 'escalated')
  );

create policy "complaints_admin_select"
  on public.complaints for select
  using (public.my_role() = 'admin');

create policy "complaints_student_insert"
  on public.complaints for insert
  with check (
    student_id = auth.uid()
    and public.my_role() = 'student'
  );

create policy "complaints_staff_insert"
  on public.complaints for insert
  with check (public.my_role() in ('staff', 'admin'));

create policy "complaints_student_update"
  on public.complaints for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "complaints_staff_update"
  on public.complaints for update
  using (
    public.my_role() = 'staff'
    and (
      assigned_staff_id = auth.uid()
      or category = public.my_category()
    )
  );

create policy "complaints_sc_update"
  on public.complaints for update
  using (
    public.my_role() = 'sc'
    and (is_urgent = true or status = 'escalated')
  );

create policy "complaints_admin_update"
  on public.complaints for all
  using (public.my_role() = 'admin');

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
  with check (
    actor_id = auth.uid() or public.my_role() = 'admin'
  );

create policy "notifications_own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "notifications_insert_staff"
  on public.notifications for insert
  with check (
    public.my_role() in ('staff', 'sc', 'admin')
    or user_id = auth.uid()
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, category, hostel_block, room_number, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    case
      when new.raw_user_meta_data->>'category' in ('electrical','plumbing','furniture','locks','other')
        then (new.raw_user_meta_data->>'category')::staff_category
      else null
    end,
    new.raw_user_meta_data->>'hostel_block',
    new.raw_user_meta_data->>'room_number',
    false
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role,
    category = excluded.category,
    hostel_block = excluded.hostel_block,
    room_number = excluded.room_number;
  return new;
end;
$$;
