-- Document chunks for retrieval-augmented grounding (pgvector, local embeddings).
create table public.chunks (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  content     text not null,
  page        int,
  order_index int not null default 0,
  embedding   vector(768),
  created_at  timestamptz not null default now()
);
create index chunks_lesson_idx on public.chunks (lesson_id, order_index);
create index chunks_embedding_idx on public.chunks using hnsw (embedding vector_cosine_ops);

alter table public.chunks enable row level security;
create policy chunks_owner on public.chunks for all
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()));

create or replace function public.match_chunks(
  p_lesson_id uuid,
  p_query vector(768),
  p_limit int default 10
)
returns table (id uuid, content text, page int, similarity float)
language sql stable security definer set search_path = public as $$
  select c.id, c.content, c.page, 1 - (c.embedding <=> p_query) as similarity
  from public.chunks c
  where c.lesson_id = p_lesson_id
    and c.embedding is not null
    and exists (select 1 from public.lessons l where l.id = p_lesson_id and l.user_id = auth.uid())
  order by c.embedding <=> p_query
  limit p_limit;
$$;

revoke all on function public.match_chunks(uuid, vector, int) from public;
grant execute on function public.match_chunks(uuid, vector, int) to authenticated;
