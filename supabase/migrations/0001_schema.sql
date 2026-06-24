-- Marginalia schema: core + knowledge graph + chat/memory + evaluation jury.
-- Agent-managed tables (LangGraph checkpointer + store) are created separately
-- by PostgresSaver.setup() / PostgresStore.setup(), not here.

create extension if not exists vector;

-- ───────────────────────── Enums ─────────────────────────
create type lesson_status     as enum ('parsing','plan_pending','in_progress','complete');
create type extraction_mode   as enum ('graph','text_fallback');
create type difficulty        as enum ('easy','medium','hard');
create type objective_status  as enum ('upcoming','current','done');
create type concept_type      as enum ('Concept','Definition','Example','Formula','Objective','Figure');
create type edge_type         as enum ('prerequisite_of','part_of','illustrates','defines','assessed_by');
create type figure_type       as enum ('diagram','chart','flowchart','photo');
create type validation_status as enum ('valid','repaired','fallback');
create type message_role      as enum ('user','tutor','system');
create type message_kind      as enum ('chat','hint','explanation','system');
create type generation_kind   as enum ('graph','plan','mcqs','summary','figures');
create type generation_status as enum ('ok','repaired','fallback','error');
create type evaluator_kind    as enum ('grounding','correctness','unambiguous','quality');
create type eval_status       as enum ('pending','passed','failed','revised');

-- ───────────────────────── Core ─────────────────────────
create table public.lessons (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null default 'Untitled lesson',
  subject          text,
  source_pdf_path  text,
  pages            int,
  status           lesson_status not null default 'parsing',
  extraction_mode  extraction_mode,
  plan_approved_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index lessons_user_created_idx on public.lessons (user_id, created_at desc);

create table public.pdf_pages (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  page_no    int not null,
  text       text not null default '',
  char_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (lesson_id, page_no)
);

create table public.objectives (
  id                uuid primary key default gen_random_uuid(),
  lesson_id         uuid not null references public.lessons(id) on delete cascade,
  title             text not null,
  difficulty        difficulty not null default 'medium',
  order_index       int not null default 0,
  status            objective_status not null default 'upcoming',
  included          boolean not null default true,
  planned_mcq_count int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index objectives_lesson_order_idx on public.objectives (lesson_id, order_index);

-- ───────────────────── Knowledge graph ─────────────────────
create table public.concepts (
  id                uuid primary key default gen_random_uuid(),
  lesson_id         uuid not null references public.lessons(id) on delete cascade,
  type              concept_type not null default 'Concept',
  label             text not null,
  body              text not null default '',
  source_page       int,
  source_start      int,
  source_end        int,
  embedding         vector(768),
  model             text,
  validation_status validation_status,
  created_at        timestamptz not null default now()
);
create index concepts_lesson_idx on public.concepts (lesson_id);
create index concepts_embedding_idx on public.concepts using hnsw (embedding vector_cosine_ops);

create table public.concept_edges (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  from_id    uuid not null references public.concepts(id) on delete cascade,
  to_id      uuid not null references public.concepts(id) on delete cascade,
  type       edge_type not null,
  created_at timestamptz not null default now(),
  unique (from_id, to_id, type)
);
create index concept_edges_lesson_idx on public.concept_edges (lesson_id);
create index concept_edges_from_idx on public.concept_edges (from_id);
create index concept_edges_to_idx on public.concept_edges (to_id);

create table public.figures (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  concept_id   uuid references public.concepts(id) on delete set null,
  storage_path text not null,
  caption      text,
  alt_text     text,
  page         int not null,
  bbox         jsonb not null,
  type         figure_type not null default 'diagram',
  model        text,
  created_at   timestamptz not null default now()
);
create index figures_lesson_idx on public.figures (lesson_id);
create index figures_concept_idx on public.figures (concept_id);

create table public.objective_concepts (
  objective_id uuid not null references public.objectives(id) on delete cascade,
  concept_id   uuid not null references public.concepts(id) on delete cascade,
  primary key (objective_id, concept_id)
);
create index objective_concepts_concept_idx on public.objective_concepts (concept_id);

-- ─────────────── MCQs + evaluation jury + attempts ───────────────
create table public.mcqs (
  id                uuid primary key default gen_random_uuid(),
  objective_id      uuid not null references public.objectives(id) on delete cascade,
  concept_id        uuid references public.concepts(id) on delete set null,
  figure_id         uuid references public.figures(id) on delete set null,
  question          text not null,
  choices           jsonb not null,                -- ["A","B","C","D"]
  correct_index     int not null,                  -- 🔒 never sent to client
  explanation       text not null default '',      -- detailed: why the answer is correct
  choice_rationales jsonb,                          -- per-option: why each is right/wrong
  hint              text not null default '',
  grounded          boolean not null default false,
  source_page       int,
  source_start      int,
  source_end        int,
  model             text,
  validation_status validation_status,
  eval_status       eval_status not null default 'pending',
  eval_score        numeric,
  eval_runs         int not null default 0,
  order_index       int not null default 0,
  created_at        timestamptz not null default now()
);
create index mcqs_objective_order_idx on public.mcqs (objective_id, order_index);
create index mcqs_concept_idx on public.mcqs (concept_id);

create table public.mcq_evaluations (
  id         uuid primary key default gen_random_uuid(),
  mcq_id     uuid not null references public.mcqs(id) on delete cascade,
  evaluator  evaluator_kind not null,
  passed     boolean not null,
  score      numeric,
  verdict    text,
  issues     jsonb,
  model      text,
  run        int not null default 1,
  created_at timestamptz not null default now()
);
create index mcq_evaluations_mcq_idx on public.mcq_evaluations (mcq_id);

create table public.attempts (
  id            uuid primary key default gen_random_uuid(),
  mcq_id        uuid not null references public.mcqs(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  selected_index int not null,
  correct       boolean not null,
  attempt_count int not null default 1,
  created_at    timestamptz not null default now()
);
create index attempts_mcq_idx on public.attempts (mcq_id, created_at);
create index attempts_user_idx on public.attempts (user_id, created_at);

-- ─────────────── Chat, memory, summaries, audit ───────────────
create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       message_role not null,
  kind       message_kind not null default 'chat',
  content    text not null,
  mcq_id     uuid references public.mcqs(id) on delete set null,
  created_at timestamptz not null default now()
);
create index chat_messages_lesson_idx on public.chat_messages (lesson_id, created_at);

create table public.user_memories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  lesson_id  uuid references public.lessons(id) on delete set null,
  content    text not null,
  embedding  vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_memories_user_idx on public.user_memories (user_id, created_at desc);
create index user_memories_embedding_idx on public.user_memories using hnsw (embedding vector_cosine_ops);

create table public.lesson_summaries (
  id                 uuid primary key default gen_random_uuid(),
  lesson_id          uuid not null references public.lessons(id) on delete cascade,
  overall_score      numeric,
  first_try_accuracy numeric,
  report             text,
  study_tips         jsonb,
  model              text,
  created_at         timestamptz not null default now(),
  unique (lesson_id)
);

create table public.generations (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  kind       generation_kind not null,
  model      text,
  status     generation_status not null default 'ok',
  raw_output jsonb,
  error      text,
  created_at timestamptz not null default now()
);
create index generations_lesson_idx on public.generations (lesson_id, created_at desc);

-- ───────────────────── updated_at trigger ─────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger lessons_set_updated     before update on public.lessons      for each row execute function public.set_updated_at();
create trigger objectives_set_updated  before update on public.objectives   for each row execute function public.set_updated_at();
create trigger memories_set_updated    before update on public.user_memories for each row execute function public.set_updated_at();
