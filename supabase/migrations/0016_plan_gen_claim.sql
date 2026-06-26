-- Concurrency guard for plan drafting. A reload mid-draft would otherwise spawn
-- a second generatePlan that piles onto the model provider's concurrency limit.
alter table public.lessons add column if not exists plan_gen_at timestamptz;

create or replace function public.claim_plan_gen(
  p_lesson_id uuid,
  p_stale_seconds int default 180
)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_owner   uuid;
  v_claimed int;
begin
  select user_id into v_owner from public.lessons where id = p_lesson_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not authorized';
  end if;

  update public.lessons
  set plan_gen_at = now()
  where id = p_lesson_id
    and (plan_gen_at is null
         or plan_gen_at < now() - make_interval(secs => p_stale_seconds));

  get diagnostics v_claimed = row_count;
  return v_claimed > 0;
end;
$$;

revoke all on function public.claim_plan_gen(uuid, int) from public;
grant execute on function public.claim_plan_gen(uuid, int) to authenticated;
