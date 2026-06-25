-- Apply plan edits and start the lesson in one transaction, so a mid-update
-- failure can't leave the plan half-approved.
create or replace function public.approve_plan(p_lesson_id uuid, p_edits jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_owner    uuid;
  v_edit     jsonb;
  v_order    int := 0;
  v_included boolean;
begin
  select user_id into v_owner from public.lessons where id = p_lesson_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not authorized';
  end if;

  for v_edit in select * from jsonb_array_elements(p_edits)
  loop
    v_included := (v_edit->>'included')::boolean;
    update public.objectives
    set difficulty  = (v_edit->>'difficulty')::difficulty,
        included    = v_included,
        order_index = case when v_included then v_order else 999 end,
        status      = case when v_included and v_order = 0 then 'current' else 'upcoming' end
    where id = (v_edit->>'id')::uuid
      and lesson_id = p_lesson_id;
    if v_included then v_order := v_order + 1; end if;
  end loop;

  update public.lessons
  set status = 'in_progress', plan_approved_at = now()
  where id = p_lesson_id;
end;
$$;

revoke all on function public.approve_plan(uuid, jsonb) from public;
grant execute on function public.approve_plan(uuid, jsonb) to authenticated;
