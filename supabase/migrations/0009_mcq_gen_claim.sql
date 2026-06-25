-- Concurrency guard for MCQ generation. The same objective can be triggered
-- twice (approval pre-warm + quiz mount, or next-objective pre-gen + mount);
-- without a lock both runs pass the "no rows yet" check and author duplicates.
-- An atomic claim lets exactly one caller generate; the rest wait for its rows.

alter table public.objectives
  add column if not exists mcq_gen_status     text,
  add column if not exists mcq_gen_started_at timestamptz;

-- Atomically claim generation for an objective. Returns true to the single
-- caller that wins the claim; false to everyone else (who should poll for rows).
-- A 'generating' claim older than p_stale_seconds is reclaimable, so a crashed
-- run never wedges the objective permanently.
create or replace function public.claim_objective_mcq_gen(
  p_objective_id uuid,
  p_stale_seconds int default 180
)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_owner   uuid;
  v_claimed int;
begin
  select l.user_id into v_owner
  from public.objectives o
  join public.lessons l on l.id = o.lesson_id
  where o.id = p_objective_id;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not authorized';
  end if;

  update public.objectives
  set mcq_gen_status = 'generating', mcq_gen_started_at = now()
  where id = p_objective_id
    and (
      mcq_gen_status is null
      or mcq_gen_status = 'error'
      or (mcq_gen_status = 'generating'
          and mcq_gen_started_at < now() - make_interval(secs => p_stale_seconds))
    );

  get diagnostics v_claimed = row_count;
  return v_claimed > 0;
end;
$$;

revoke all on function public.claim_objective_mcq_gen(uuid, int) from public;
grant execute on function public.claim_objective_mcq_gen(uuid, int) to authenticated;
