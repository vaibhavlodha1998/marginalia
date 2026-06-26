-- Return the attempt number from grade_mcq so the UI can show how many tries a
-- question took (1 = first try). Drop first: the return type changed.
drop function if exists public.grade_mcq(uuid, int);
create or replace function public.grade_mcq(p_mcq_id uuid, p_selected_index int)
returns table (correct boolean, explanation text, choice_rationales jsonb, hint text, attempt_count int)
language plpgsql security definer set search_path = public as $$
declare
  v_mcq           public.mcqs%rowtype;
  v_owner         uuid;
  v_correct       boolean;
  v_attempt_count int;
  v_hint          text;
  v_hint_count    int;
  v_idx           int;
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

  if not v_correct then
    v_hint_count := coalesce(jsonb_array_length(v_mcq.hints), 0);
    if v_hint_count > 0 then
      v_idx := least(v_attempt_count, v_hint_count) - 1;
      v_hint := v_mcq.hints ->> v_idx;
    else
      v_hint := v_mcq.hint;
    end if;
  end if;

  return query select
    v_correct,
    case when v_correct then v_mcq.explanation end,
    case when v_correct then v_mcq.choice_rationales end,
    v_hint,
    v_attempt_count;
end;
$$;

revoke all on function public.grade_mcq(uuid, int) from public;
grant execute on function public.grade_mcq(uuid, int) to authenticated;
