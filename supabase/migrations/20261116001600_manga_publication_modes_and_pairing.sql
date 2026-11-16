alter table public.mangas
  add column if not exists publication_mode text not null default 'traditional',
  add column if not exists paired_manga_id uuid null references public.mangas(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mangas_publication_mode_check'
      and conrelid = 'public.mangas'::regclass
  ) then
    alter table public.mangas
      add constraint mangas_publication_mode_check
      check (publication_mode in ('traditional','experience'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'mangas_not_paired_to_self'
      and conrelid = 'public.mangas'::regclass
  ) then
    alter table public.mangas
      add constraint mangas_not_paired_to_self
      check (paired_manga_id is null or paired_manga_id <> id);
  end if;
end
$$;

create index if not exists mangas_paired_manga_id_idx
  on public.mangas(paired_manga_id);
