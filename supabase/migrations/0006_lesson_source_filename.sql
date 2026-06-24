-- Keep the user's original upload filename (distinct from the storage path).
alter table public.lessons add column if not exists source_filename text;
