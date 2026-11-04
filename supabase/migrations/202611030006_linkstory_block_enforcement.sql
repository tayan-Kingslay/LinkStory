-- LinkStory safety enforcement: blocks affect social surfaces and private messages.
-- Conversation membership is invitation-based; users cannot join a known UUID.

create or replace function private.can_interact_with_user(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select case
    when auth.uid() is null or p_other_user_id is null then true
    when p_other_user_id = auth.uid() then true
    else not exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p_other_user_id)
         or (b.blocker_id = p_other_user_id and b.blocked_id = auth.uid())
    )
  end;
$$;
revoke all on function private.can_interact_with_user(uuid) from public;
grant execute on function private.can_interact_with_user(uuid) to anon, authenticated;

-- SECURITY DEFINER membership predicates avoid recursive RLS when one table's
-- policy needs to inspect another table that has its own row policies.
create or replace function private.is_conversation_creator(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $
  select auth.uid() is not null
     and exists (
       select 1 from public.conversations c
       where c.id = p_conversation_id and c.created_by = auth.uid()
     );
$;

create or replace function private.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $
  select auth.uid() is not null
     and exists (
       select 1 from public.conversation_members cm
       where cm.conversation_id = p_conversation_id
         and cm.user_id = auth.uid()
         and cm.status = 'accepted'
     );
$;

create or replace function private.conversation_has_blocked_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, private
as $
  select auth.uid() is not null
     and exists (
       select 1 from public.conversation_members cm
       where cm.conversation_id = p_conversation_id
         and cm.user_id <> auth.uid()
         and not private.can_interact_with_user(cm.user_id)
     );
$;

revoke all on function private.is_conversation_creator(uuid) from public;
revoke all on function private.is_conversation_member(uuid) from public;
revoke all on function private.conversation_has_blocked_participant(uuid) from public;
grant execute on function private.is_conversation_creator(uuid) to authenticated;
grant execute on function private.is_conversation_member(uuid) to authenticated;
grant execute on function private.conversation_has_blocked_participant(uuid) to authenticated;

-- Posts are not visible to either side of a block, and private profiles do not
-- leak posts through a separate public table.
drop policy if exists posts_public_read on public.posts;
create policy posts_public_read
  on public.posts for select to anon, authenticated
  using (
    private.can_interact_with_user(author_id)
    and private.can_view_profile(author_id)
  );

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own
  on public.posts for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own
  on public.posts for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own
  on public.posts for delete to authenticated
  using (auth.uid() = author_id);

-- Comments inherit the visibility of both their author and their parent post.
drop policy if exists comments_public_read on public.comments;
create policy comments_public_read
  on public.comments for select to anon, authenticated
  using (
    private.can_interact_with_user(author_id)
    and private.can_view_profile(author_id)
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and private.can_interact_with_user(p.author_id)
        and private.can_view_profile(p.author_id)
    )
  );

drop policy if exists comments_own_insert on public.comments;
create policy comments_own_insert
  on public.comments for insert to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and private.can_interact_with_user(p.author_id)
        and private.can_view_profile(p.author_id)
    )
  );

drop policy if exists comments_own_delete on public.comments;
create policy comments_own_delete
  on public.comments for delete to authenticated
  using (auth.uid() = author_id);

-- Manga comments follow the same block and profile-visibility rules.
drop policy if exists manga_comments_public_read on public.manga_comments;
create policy manga_comments_public_read
  on public.manga_comments for select to anon, authenticated
  using (
    private.can_interact_with_user(author_id)
    and private.can_view_profile(author_id)
    and exists (
      select 1 from public.mangas m
      where m.id = manga_comments.manga_id
        and private.can_interact_with_user(m.creator_id)
        and private.can_view_profile(m.creator_id)
    )
  );

drop policy if exists manga_comments_auth_insert on public.manga_comments;
create policy manga_comments_auth_insert
  on public.manga_comments for insert to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.mangas m
      where m.id = manga_comments.manga_id
        and private.can_interact_with_user(m.creator_id)
        and private.can_view_profile(m.creator_id)
    )
  );

drop policy if exists manga_comments_own_delete on public.manga_comments;
create policy manga_comments_own_delete
  on public.manga_comments for delete to authenticated
  using (auth.uid() = author_id);

-- A block in either direction suppresses the follow relationship and prevents
-- new follows. Existing follows can still be deleted by the follower.
drop policy if exists follows_public_read on public.follows;
create policy follows_public_read
  on public.follows for select to anon, authenticated
  using (
    private.can_interact_with_user(follower_id)
    and private.can_interact_with_user(following_id)
  );

drop policy if exists follows_own_insert on public.follows;
create policy follows_own_insert
  on public.follows for insert to authenticated
  with check (
    auth.uid() = follower_id
    and private.can_interact_with_user(following_id)
  );

drop policy if exists follows_own_delete on public.follows;
create policy follows_own_delete
  on public.follows for delete to authenticated
  using (auth.uid() = follower_id);

-- Conversations have an immutable owner. The creator may add themselves, then
-- invite another account through the authenticated RPC below. A known UUID is
-- no longer enough to join and read an existing conversation.
alter table public.conversations
  add column if not exists created_by uuid references auth.users(id) default auth.uid();

alter table public.conversations
  alter column created_by set default auth.uid();

alter table public.conversations
  alter column created_by set not null;

alter table public.conversation_members
  add column if not exists status text not null default 'accepted';

alter table public.conversation_members
  drop constraint if exists conversation_members_status_check;
alter table public.conversation_members
  add constraint conversation_members_status_check
  check (status in ('pending', 'accepted'));

create index if not exists conversation_members_conversation_status_idx
  on public.conversation_members(conversation_id, status);

drop policy if exists conversation_member_insert on public.conversations;
create policy conversation_member_insert
  on public.conversations for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists conversation_member_read on public.conversations;
create policy conversation_member_read
  on public.conversations for select to authenticated
  using (
    private.is_conversation_member(id)
    and not private.conversation_has_blocked_participant(id)
  );

drop policy if exists members_insert_self on public.conversation_members;
create policy members_insert_self
  on public.conversation_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and private.is_conversation_creator(conversation_id)
  );

drop policy if exists members_read_own on public.conversation_members;
create policy members_read_own
  on public.conversation_members for select to authenticated
  using (user_id = auth.uid());

create or replace function public.invite_linkstory_conversation_member(
  p_conversation_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, private
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária' using errcode = '42501';
  end if;
  if p_user_id is null or p_user_id = auth.uid() then
    raise exception 'Destinatário inválido' using errcode = '22023';
  end if;
  if not private.is_conversation_creator(p_conversation_id) then
    raise exception 'Somente o criador pode convidar participantes' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'Conta destinatária não encontrada' using errcode = '22023';
  end if;
  if not private.can_interact_with_user(p_user_id) then
    raise exception 'Não é possível convidar esta conta' using errcode = '42501';
  end if;

  insert into public.conversation_members (conversation_id, user_id, status)
  values (p_conversation_id, p_user_id, 'pending')
  on conflict (conversation_id, user_id) do nothing;
end;
$$;
revoke all on function public.invite_linkstory_conversation_member(uuid,uuid) from public, anon;
grant execute on function public.invite_linkstory_conversation_member(uuid,uuid) to authenticated;

create or replace function public.accept_linkstory_conversation_invite(
  p_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária' using errcode = '42501';
  end if;

  update public.conversation_members
     set status = 'accepted'
   where conversation_id = p_conversation_id
     and user_id = auth.uid()
     and status = 'pending';

  if not found then
    raise exception 'Convite não encontrado ou já respondido' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.accept_linkstory_conversation_invite(uuid) from public, anon;
grant execute on function public.accept_linkstory_conversation_invite(uuid) to authenticated;

-- Remove direct table privileges that could bypass the intended invitation
-- workflow. All conversation actions go through owner/member RLS and RPCs.
revoke all on table public.conversations, public.conversation_members, public.messages
  from public, anon, authenticated;
grant select, insert on table public.conversations to authenticated;
grant select on table public.conversation_members to authenticated;
grant insert (conversation_id, user_id) on table public.conversation_members to authenticated;
grant select on table public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on table public.messages to authenticated;

drop policy if exists messages_member_insert on public.messages;
create policy messages_member_insert
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and private.is_conversation_member(conversation_id)
    and not private.conversation_has_blocked_participant(conversation_id)
  );

drop policy if exists messages_member_read on public.messages;
create policy messages_member_read
  on public.messages for select to authenticated
  using (
    private.is_conversation_member(conversation_id)
    and not private.conversation_has_blocked_participant(conversation_id)
  );
