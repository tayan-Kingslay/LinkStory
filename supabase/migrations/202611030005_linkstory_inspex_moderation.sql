-- INSPEX moderation: only trusted LinkStory moderators can publish or review.
-- Public visitors may submit suggestions, but cannot read or alter the queue.

-- Articles: public reading remains limited to published rows by the existing
-- public-read policy. All writes are restricted to the trusted moderator list.
drop policy if exists "authenticated manage inspex" on public.inspex_articles;
drop policy if exists inspex_moderator_manage_articles on public.inspex_articles;
create policy inspex_moderator_manage_articles
  on public.inspex_articles
  for all to authenticated
  using ((select private.is_linkstory_moderator()))
  with check ((select private.is_linkstory_moderator()));

-- Submissions: remove broad authenticated review/delete access and the
-- unrestricted insert policy. Column grants prevent submitters from setting
-- review status, admin notes, reviewer identity, timestamps, or linked article.
drop policy if exists "authenticated delete inspex submissions" on public.inspex_submissions;
drop policy if exists "authenticated manage inspex submissions" on public.inspex_submissions;
drop policy if exists "authenticated update inspex submissions" on public.inspex_submissions;
drop policy if exists "public insert inspex submissions" on public.inspex_submissions;

create policy inspex_moderator_read_submissions
  on public.inspex_submissions
  for select to authenticated
  using ((select private.is_linkstory_moderator()));

create policy inspex_public_submit_suggestion
  on public.inspex_submissions
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and admin_note is null
    and reviewed_at is null
    and reviewed_by is null
    and article_id is null
  );

create policy inspex_moderator_update_submissions
  on public.inspex_submissions
  for update to authenticated
  using ((select private.is_linkstory_moderator()))
  with check ((select private.is_linkstory_moderator()));

create policy inspex_moderator_delete_submissions
  on public.inspex_submissions
  for delete to authenticated
  using ((select private.is_linkstory_moderator()));

-- Remove broad grants and expose only the operations each role needs.
revoke all on table public.inspex_articles from public, anon, authenticated;
grant select on table public.inspex_articles to anon, authenticated;
grant insert, update, delete on table public.inspex_articles to authenticated;

revoke all on table public.inspex_submissions from public, anon, authenticated;
grant insert (name, title, category, content, source_url)
  on table public.inspex_submissions to anon, authenticated;
grant select on table public.inspex_submissions to authenticated;
grant update (status, admin_note, reviewed_at, reviewed_by, article_id)
  on table public.inspex_submissions to authenticated;
grant delete on table public.inspex_submissions to authenticated;
