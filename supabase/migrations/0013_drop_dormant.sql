-- Remove the dormant knowledge-graph and memory schema. Nothing in the app
-- populated these; grounding uses the chunks table (RAG) instead.

drop function if exists public.match_concepts(uuid, vector, int);

alter table public.mcqs    drop column if exists concept_id;
alter table public.figures drop column if exists concept_id;
alter table public.lessons drop column if exists extraction_mode;

drop table if exists public.objective_concepts;
drop table if exists public.concept_edges;
drop table if exists public.concepts;
drop table if exists public.user_memories;

drop type if exists public.edge_type;
drop type if exists public.concept_type;
drop type if exists public.extraction_mode;
