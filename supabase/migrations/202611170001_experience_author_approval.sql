-- Author approval gate for LinkStory's Melhor Experiência mode.
-- Existing chapters remain public; only newly created experience chapters start private.
alter table public.manga_chapters
  add column if not exists review_status text not null default 'published';

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

drop policy if exists "manga_chapters_age_gated_read" on public.manga_chapters;
create policy "manga_chapters_age_gated_read"
  on public.manga_chapters for select to anon, authenticated
  using (
    (
      review_status = 'published'
      and exists (
        select 1 from public.mangas m
        where m.id = manga_chapters.manga_id
          and m.status = 'published'
          and private.can_view_manga(m.age_rating)
      )
    )
    or exists (
      select 1 from public.mangas own
      where own.id = manga_chapters.manga_id
        and own.creator_id = (select auth.uid())
    )
  );

drop policy if exists "manga_pages_age_gated_read" on public.manga_pages;
create policy "manga_pages_age_gated_read"
  on public.manga_pages for select to anon, authenticated
  using (
    exists (
      select 1
      from public.manga_chapters c
      join public.mangas m on m.id = c.manga_id
      where c.id = manga_pages.chapter_id
        and (
          (
            c.review_status = 'published'
            and m.status = 'published'
            and private.can_view_manga(m.age_rating)
          )
          or m.creator_id = (select auth.uid())
        )
    )
  );

drop policy if exists "manga_chapters_creator_review_update" on public.manga_chapters;
create policy "manga_chapters_creator_review_update"
  on public.manga_chapters for update to authenticated
  using (
    exists (
      select 1 from public.mangas m
      where m.id = manga_chapters.manga_id
        and m.creator_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.mangas m
      where m.id = manga_chapters.manga_id
        and m.creator_id = (select auth.uid())
    )
  );

grant update (review_status) on public.manga_chapters to authenticated;
