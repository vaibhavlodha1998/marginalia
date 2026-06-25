-- Reconcile planned_mcq_count with the questions that actually exist, for
-- objectives generated before the jury could drop questions below the plan.
update public.objectives o
set planned_mcq_count = c.cnt
from (
  select objective_id, count(*) as cnt
  from public.mcqs
  group by objective_id
) c
where c.objective_id = o.id
  and o.planned_mcq_count is distinct from c.cnt;
