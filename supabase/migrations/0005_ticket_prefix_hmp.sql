-- Ticket IDs: HMP-YYYY-NNNNN (Hostel Maintenance Portal)

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

update public.complaints
set ticket_id = regexp_replace(ticket_id, '^HZL-', 'HMP-')
where ticket_id like 'HZL-%';
