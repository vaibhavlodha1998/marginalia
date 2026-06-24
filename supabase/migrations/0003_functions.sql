-- Server-side grading + retrieval. grade_mcq is the only path that reads
-- correct_index / explanation / choice_rationales, so spoilers never reach the
-- client even under network inspection.

create or replace function public.grade_mcq(p_mcq_id uuid, p_selected_index int)
returns table (correct boolean, explanation text, choice_rationales jsonb, hint text)
language plpgsql security definer set search_path = public as $$
declare
  v_mcq           public.mcqs%rowtype;
  v_owner         uuid;
  v_correct       boolean;
  v_attempt_count int;
begin
  select * into v_mcq from public.mcqs where id = p_mcq_id;
  if not found then
    raise exception 'mcq % not found', p_mcq_id;
  end if;

  select l.user_id into v_owner
  from public.objectives o
  join public.lessons l on l.id = o.lesson_id
  where o.id = v_mcq.objective_id;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not authorized';
  end if;

  v_correct := (p_selected_index = v_mcq.correct_index);

  select coalesce(max(a.attempt_count), 0) + 1 into v_attempt_count
  from public.attempts a
  where a.mcq_id = p_mcq_id and a.user_id = auth.uid();

  insert into public.attempts (mcq_id, user_id, selected_index, correct, attempt_count)
  values (p_mcq_id, auth.uid(), p_selected_index, v_correct, v_attempt_count);

  return query select
    v_correct,
    case when v_correct then v_mcq.explanation end,
    case when v_correct then v_mcq.choice_rationales end,
    case when not v_correct then v_mcq.hint end;
end;
$$;

create or replace function public.match_concepts(
  p_lesson_id uuid,
  p_query vector(768),
  p_limit int default 8
)
returns table (id uuid, label text, body text, similarity float)
language sql stable security definer set search_path = public as $$
  select c.id, c.label, c.body, 1 - (c.embedding <=> p_query) as similarity
  from public.concepts c
  where c.lesson_id = p_lesson_id
    and c.embedding is not null
    and exists (select 1 from public.lessons l where l.id = p_lesson_id and l.user_id = auth.uid())
  order by c.embedding <=> p_query
  limit p_limit;
$$;

-- Per-objective progress, derived from attempts (no duplicated state).
-- security_invoker so the view honours the caller's RLS.
create view public.objective_progress
with (security_invoker = on) as
select
  o.id        as objective_id,
  o.lesson_id as lesson_id,
  count(m.id) as total_mcqs,
  count(m.id) filter (where ca.mcq_id is not null) as correct_mcqs,
  count(m.id) filter (where fa.mcq_id is not null) as first_try_correct
from public.objectives o
left join public.mcqs m on m.objective_id = o.id
left join (select distinct mcq_id from public.attempts where correct) ca on ca.mcq_id = m.id
left join (select distinct mcq_id from public.attempts where correct and attempt_count = 1) fa on fa.mcq_id = m.id
group by o.id, o.lesson_id;

revoke all on function public.grade_mcq(uuid, int) from public;
revoke all on function public.match_concepts(uuid, vector, int) from public;
grant execute on function public.grade_mcq(uuid, int) to authenticated;
grant execute on function public.match_concepts(uuid, vector, int) to authenticated;
