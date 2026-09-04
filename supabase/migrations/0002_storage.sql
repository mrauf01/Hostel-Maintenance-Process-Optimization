-- Complaint photo bucket
insert into storage.buckets (id, name, public)
values ('complaint-photos', 'complaint-photos', true)
on conflict (id) do nothing;

create policy "photos_public_read"
  on storage.objects for select
  using (bucket_id = 'complaint-photos');

create policy "photos_auth_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'complaint-photos');

create policy "photos_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'complaint-photos');
