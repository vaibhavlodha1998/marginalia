-- Group objectives under a named section/module for a course-outline structure.
alter table public.objectives add column if not exists section text;
