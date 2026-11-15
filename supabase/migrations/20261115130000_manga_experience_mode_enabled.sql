alter table public.mangas
  add column if not exists experience_mode_enabled boolean not null default false;
