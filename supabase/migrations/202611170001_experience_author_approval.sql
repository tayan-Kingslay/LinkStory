-- Author approval gate for LinkStory's Melhor Experiência mode.
-- Existing chapters remain public; only newly created experience chapters start private.
alter table public.manga_chapters
  add column if not exists review_status text not null default 'published';
alter table public.manga_chapters
  add column if not exists review_feedback text,
  add column if not exists reviewed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'manga_chapters_review_status_check'
      and conrelid = 'public.manga_chapters'::regclass
  ) then
    alter table public.manga_chapters
      add constraint manga_chapters_review_status_check
      check (review_status in ('draft','rejected','published'));
  end if;
end
$$;

create index if not exists manga_chapters_review_status_idx
  on public.manga_chapters (manga_id, review_status, chapter_number);

-- Replace the currently deployed permissive public-read policies.
-- Published chapters keep the existing public reading behavior; drafts remain creator-only.
drop policy if exists "mangas_public_read" on public.mangas;
drop policy if exists "mangas_age_gated_read" on public.mangas;
create policy "mangas_public_read"
  on public.mangas for select to anon, authenticated
  using (status = 'published');

drop policy if exists "mangas_creator_read" on public.mangas;
create policy "mangas_creator_read"
  on public.mangas for select to authenticated
  using (creator_id = (select auth.uid()) and is_creator());

drop policy if exists "manga_chapters_public_read" on public.manga_chapters;
drop policy if exists "manga_chapters_age_gated_read" on public.manga_chapters;
create policy "manga_chapters_public_read"
  on public.manga_chapters for select to anon, authenticated
  using (
    review_status = 'published'
    and exists (
      select 1 from public.mangas m
      where m.id = manga_chapters.manga_id
        and m.status = 'published'
    )
  );

drop policy if exists "manga_chapters_creator_read" on public.manga_chapters;
create policy "manga_chapters_creator_read"
  on public.manga_chapters for select to authenticated
  using (
    exists (
      select 1 from public.mangas own
      where own.id = manga_chapters.manga_id
        and own.creator_id = (select auth.uid())
    )
    and is_creator()
  );

drop policy if exists "manga_pages_public_read" on public.manga_pages;
drop policy if exists "manga_pages_age_gated_read" on public.manga_pages;
create policy "manga_pages_public_read"
  on public.manga_pages for select to anon, authenticated
  using (
    exists (
      select 1
      from public.manga_chapters c
      join public.mangas m on m.id = c.manga_id
      where c.id = manga_pages.chapter_id
        and c.review_status = 'published'
        and m.status = 'published'
    )
  );

drop policy if exists "manga_pages_creator_read" on public.manga_pages;
create policy "manga_pages_creator_read"
  on public.manga_pages for select to authenticated
  using (
    exists (
      select 1
      from public.manga_chapters c
      join public.mangas m on m.id = c.manga_id
      where c.id = manga_pages.chapter_id
        and m.creator_id = (select auth.uid())
    )
    and is_creator()
  );

grant update (review_status) on public.manga_chapters to authenticated;
