-- Cover high-use foreign-key lookups and user-scoped joins.
create index if not exists conversation_members_user_id_idx on public.conversation_members (user_id, conversation_id);
create index if not exists manga_comments_manga_created_idx on public.manga_comments (manga_id, created_at desc);
create index if not exists manga_comments_author_id_idx on public.manga_comments (author_id);
create index if not exists manga_likes_user_id_idx on public.manga_likes (user_id);
create index if not exists manga_ratings_user_id_idx on public.manga_ratings (user_id);
create index if not exists comment_likes_user_id_idx on public.comment_likes (user_id);
create index if not exists comments_author_id_idx on public.comments (author_id);
create index if not exists friendships_user_b_idx on public.friendships (user_b);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists post_likes_user_id_idx on public.post_likes (user_id);
create index if not exists reading_activity_chapter_id_idx on public.reading_activity (chapter_id);
create index if not exists reading_activity_manga_id_idx on public.reading_activity (manga_id);

-- Evaluate auth.uid() once per statement in policies, without changing their logic.
do $$
declare
  p record;
  q text;
  c text;
  marker constant text := '__LINKSTORY_AUTH_UID_ALREADY_SCALAR__';
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname in ('public','storage')
      and (coalesce(qual,'') like '%auth.uid()%'
        or coalesce(with_check,'') like '%auth.uid()%')
  loop
    q := p.qual;
    c := p.with_check;
    if q is not null then
      q := replace(q, '( SELECT auth.uid() AS uid)', marker);
      q := replace(q, 'auth.uid()', '(select auth.uid())');
      q := replace(q, marker, '( SELECT auth.uid() AS uid)');
    end if;
    if c is not null then
      c := replace(c, '( SELECT auth.uid() AS uid)', marker);
      c := replace(c, 'auth.uid()', '(select auth.uid())');
      c := replace(c, marker, '( SELECT auth.uid() AS uid)');
    end if;
    execute format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename)
      || case when q is not null then format(' using (%s)', q) else '' end
      || case when c is not null then format(' with check (%s)', c) else '' end;
  end loop;
end $$;
