-- Run AFTER you create Auth users in Supabase (Authentication → Users → Add user).
-- Replace the emails with the ones you actually created.

update public.profiles set role = 'admin' where email = 'admin@hostel.edu';
update public.profiles set role = 'sc' where email = 'sc@hostel.edu';
update public.profiles set role = 'staff', category = 'electrical' where email = 'electrical@hostel.edu';
update public.profiles set role = 'staff', category = 'plumbing' where email = 'plumbing@hostel.edu';
update public.profiles set role = 'staff', category = 'furniture' where email = 'furniture@hostel.edu';
update public.profiles set role = 'staff', category = 'locks' where email = 'locks@hostel.edu';
update public.profiles set role = 'staff', category = 'other' where email = 'desk@hostel.edu';
