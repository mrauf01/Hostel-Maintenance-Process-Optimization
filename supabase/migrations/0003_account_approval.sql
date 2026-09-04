-- Account approval: new signups wait for Admin before dashboards unlock.

alter table public.profiles
  add column if not exists approved boolean not null default false;

-- Existing users (created in Auth console) stay active
update public.profiles set approved = true where approved = false and created_at < now();

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
