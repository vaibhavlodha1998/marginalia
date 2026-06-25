-- Where an attached figure should render: with the question (context needed to
-- answer) or with the explanation (would spoil the answer up-front, or is best
-- understood after answering). Existing rows default to 'question'.
alter table public.mcqs
  add column if not exists figure_placement text not null default 'question';

alter table public.mcqs
  drop constraint if exists mcqs_figure_placement_check;
alter table public.mcqs
  add constraint mcqs_figure_placement_check
  check (figure_placement in ('question', 'explanation'));
