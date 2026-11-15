alter table public.manga_pages
add column if not exists panels jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'manga_pages_panels_is_array'
      and conrelid = 'public.manga_pages'::regclass
  ) then
    alter table public.manga_pages
      add constraint manga_pages_panels_is_array
      check (jsonb_typeof(panels) = 'array');
  end if;
end
$$;
