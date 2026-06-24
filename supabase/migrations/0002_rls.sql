-- Row Level Security. Ownership roots at lessons.user_id; children gate via the
-- lesson chain. One permissive `for all` policy per table (using = read paths,
-- with check = write paths).

alter table public.lessons            enable row level security;
alter table public.pdf_pages          enable row level security;
alter table public.objectives         enable row level security;
alter table public.concepts           enable row level security;
alter table public.concept_edges      enable row level security;
alter table public.figures            enable row level security;
alter table public.objective_concepts enable row level security;
alter table public.mcqs               enable row level security;
alter table public.mcq_evaluations    enable row level security;
alter table public.attempts           enable row level security;
alter table public.chat_messages      enable row level security;
alter table public.user_memories      enable row level security;
alter table public.lesson_summaries   enable row level security;
alter table public.generations        enable row level security;

-- lessons: direct ownership
create policy lessons_owner on public.lessons for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- children gated by lesson_id
create policy pdf_pages_owner on public.pdf_pages for all
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()));

create policy objectives_owner on public.objectives for all
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()));

create policy concepts_owner on public.concepts for all
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()));

create policy concept_edges_owner on public.concept_edges for all
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()));

create policy figures_owner on public.figures for all
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()));

create policy lesson_summaries_owner on public.lesson_summaries for all
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()));

create policy generations_owner on public.generations for all
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.user_id = auth.uid()));

-- objective_concepts gated by objective -> lesson
create policy objective_concepts_owner on public.objective_concepts for all
  using (exists (
    select 1 from public.objectives o join public.lessons l on l.id = o.lesson_id
    where o.id = objective_id and l.user_id = auth.uid()))
  with check (exists (
    select 1 from public.objectives o join public.lessons l on l.id = o.lesson_id
    where o.id = objective_id and l.user_id = auth.uid()));

-- mcqs gated by objective -> lesson
create policy mcqs_owner on public.mcqs for all
  using (exists (
    select 1 from public.objectives o join public.lessons l on l.id = o.lesson_id
    where o.id = objective_id and l.user_id = auth.uid()))
  with check (exists (
    select 1 from public.objectives o join public.lessons l on l.id = o.lesson_id
    where o.id = objective_id and l.user_id = auth.uid()));

-- mcq_evaluations gated by mcq -> objective -> lesson
create policy mcq_evaluations_owner on public.mcq_evaluations for all
  using (exists (
    select 1 from public.mcqs m
    join public.objectives o on o.id = m.objective_id
    join public.lessons l on l.id = o.lesson_id
    where m.id = mcq_id and l.user_id = auth.uid()))
  with check (exists (
    select 1 from public.mcqs m
    join public.objectives o on o.id = m.objective_id
    join public.lessons l on l.id = o.lesson_id
    where m.id = mcq_id and l.user_id = auth.uid()));

-- user-scoped tables
create policy attempts_owner on public.attempts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy chat_messages_owner on public.chat_messages for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_memories_owner on public.user_memories for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────── Spoiler protection (column-level) ─────────
-- Client roles can never read the answer key or post-answer content directly;
-- it is returned only through grade_mcq() after a correct submission.
revoke select (correct_index, explanation, choice_rationales)
  on public.mcqs from anon, authenticated;
