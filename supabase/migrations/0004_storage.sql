-- Private storage buckets. Object paths are prefixed with the owner's user id
-- ({user_id}/...), and policies enforce that prefix so users only touch their
-- own files.

insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false), ('figures', 'figures', false)
on conflict (id) do nothing;

create policy "own pdfs" on storage.objects for all
  to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own figures" on storage.objects for all
  to authenticated
  using (bucket_id = 'figures' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'figures' and (storage.foldername(name))[1] = auth.uid()::text);
