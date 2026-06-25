-- Extracted-image figures have no bounding box (the image is the figure).
alter table public.figures alter column bbox drop not null;
