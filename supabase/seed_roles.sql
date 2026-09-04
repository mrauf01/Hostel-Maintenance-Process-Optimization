-- Run AFTER Auth users exist (Authentication → Users). Safe to re-run.

update public.profiles
set role = 'admin', approved = true
where lower(email) in ('admin@hostel.edu', 'mrauf1192@gmail.com');

update public.profiles
set role = 'student', approved = true
where lower(email) = 'mraufv2@gmail.com';

update public.profiles set role = 'sc', approved = true where email = 'sc@hostel.edu';
update public.profiles set role = 'staff', category = 'electrical', approved = true where email = 'electrical@hostel.edu';
update public.profiles set role = 'staff', category = 'plumbing', approved = true where email = 'plumbing@hostel.edu';
update public.profiles set role = 'staff', category = 'furniture', approved = true where email = 'furniture@hostel.edu';
update public.profiles set role = 'staff', category = 'locks', approved = true where email = 'locks@hostel.edu';
update public.profiles set role = 'staff', category = 'other', approved = true where email = 'desk@hostel.edu';
