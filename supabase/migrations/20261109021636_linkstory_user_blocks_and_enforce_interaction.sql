
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_id_idx on public.user_blocks(blocked_id, blocker_id);
alter table public.user_blocks enable row level security;
drop policy if exists "Users manage their own blocks" on public.user_blocks;
create policy "Users manage their own blocks"
  on public.user_blocks for all to authenticated
  using ((select auth.uid()) = blocker_id)
  with check ((select auth.uid()) = blocker_id);
revoke all on table public.user_blocks from public, anon, authenticated;
grant select, insert, delete on table public.user_blocks to authenticated;

grant usage on schema private to anon, authenticated;

create or replace function private.can_interact_with_user(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null or p_other_user_id is null then true
    when p_other_user_id = auth.uid() then true
    else not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p_other_user_id)
         or (b.blocker_id = p_other_user_id and b.blocked_id = auth.uid())
    )
  end;
$$;
revoke all on function private.can_interact_with_user(uuid) from public;
grant execute on function private.can_interact_with_user(uuid) to anon, authenticated;

create or replace function private.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = auth.uid()
  );
$$;
revoke all on function private.is_conversation_member(uuid) from public, anon;
grant execute on function private.is_conversation_member(uuid) to authenticated;

create or replace function private.conversation_has_blocked_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id <> auth.uid()
      and not private.can_interact_with_user(cm.user_id)
  );
$$;
revoke all on function private.conversation_has_blocked_participant(uuid) from public, anon;
grant execute on function private.conversation_has_blocked_participant(uuid) to authenticated;

drop policy if exists posts_public_read on public.posts;
create policy posts_public_read on public.posts
  for select to anon, authenticated
  using (private.can_interact_with_user(author_id));

drop policy if exists comments_public_read on public.comments;
create policy comments_public_read on public.comments
  for select to anon, authenticated
  using (
    private.can_interact_with_user(author_id)
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and private.can_interact_with_user(p.author_id)
    )
  );

drop policy if exists comments_own_insert on public.comments;
create policy comments_own_insert on public.comments
  for insert to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and private.can_interact_with_user(p.author_id)
    )
  );

drop policy if exists manga_comments_public_read on public.manga_comments;
create policy manga_comments_public_read on public.manga_comments
  for select to anon, authenticated
  using (
    private.can_interact_with_user(author_id)
    and exists (
      select 1 from public.mangas m
      where m.id = manga_comments.manga_id
        and private.can_interact_with_user(m.creator_id)
    )
  );

drop policy if exists manga_comments_auth_insert on public.manga_comments;
create policy manga_comments_auth_insert on public.manga_comments
  for insert to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.mangas m
      where m.id = manga_comments.manga_id
        and private.can_interact_with_user(m.creator_id)
    )
  );

drop policy if exists follows_public_read on public.follows;
create policy follows_public_read on public.follows
  for select to anon, authenticated
  using (
    private.can_interact_with_user(follower_id)
    and private.can_interact_with_user(following_id)
  );

drop policy if exists follows_own_insert on public.follows;
create policy follows_own_insert on public.follows
  for insert to authenticated
  with check (
    auth.uid() = follower_id
    and private.can_interact_with_user(following_id)
  );

drop policy if exists friend_requests_read_participants on public.friend_requests;
create policy friend_requests_read_participants on public.friend_requests
  for select to authenticated
  using (
    (auth.uid() = sender_id and private.can_interact_with_user(recipient_id))
    or (auth.uid() = recipient_id and private.can_interact_with_user(sender_id))
  );

drop policy if exists friendships_read_participants on public.friendships;
create policy friendships_read_participants on public.friendships
  for select to authenticated
  using (
    (auth.uid() = user_a and private.can_interact_with_user(user_b))
    or (auth.uid() = user_b and private.can_interact_with_user(user_a))
  );

drop policy if exists members_read_own on public.conversation_members;
create policy members_read_own on public.conversation_members
  for select to authenticated
  using (user_id = auth.uid() and not private.conversation_has_blocked_participant(conversation_id));

drop policy if exists conversation_member_read on public.conversations;
create policy conversation_member_read on public.conversations
  for select to authenticated
  using (
    private.is_conversation_member(id)
    and not private.conversation_has_blocked_participant(id)
  );

drop policy if exists messages_member_insert on public.messages;
create policy messages_member_insert on public.messages
  for insert to authenticated
  with check (
    auth.uid() = sender_id
    and private.is_conversation_member(conversation_id)
    and not private.conversation_has_blocked_participant(conversation_id)
  );

drop policy if exists messages_member_read on public.messages;
create policy messages_member_read on public.messages
  for select to authenticated
  using (
    private.is_conversation_member(conversation_id)
    and not private.conversation_has_blocked_participant(conversation_id)
    and not exists (
      select 1 from public.message_user_deletions d
      where d.message_id = messages.id and d.user_id = auth.uid()
    )
  );

create or replace function public.create_or_get_direct_conversation(p_friend_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_me uuid := auth.uid();
  v_conversation uuid;
begin
  if v_me is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if p_friend_id is null or p_friend_id = v_me then raise exception 'Amigo inválido.' using errcode = '22023'; end if;
  if not private.can_interact_with_user(p_friend_id) then
    raise exception 'Não é possível iniciar uma conversa com esta conta.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.friendships
    where user_a = least(v_me,p_friend_id) and user_b = greatest(v_me,p_friend_id)
  ) then raise exception 'Vocês precisam ser amigos para iniciar uma conversa.'; end if;

  select c.id into v_conversation
  from public.conversations c
  join public.conversation_members mine on mine.conversation_id = c.id and mine.user_id = v_me
  join public.conversation_members other on other.conversation_id = c.id and other.user_id = p_friend_id
  where (select count(*) from public.conversation_members cm where cm.conversation_id = c.id) = 2
  order by c.created_at desc limit 1;

  if v_conversation is null then
    insert into public.conversations default values returning id into v_conversation;
    insert into public.conversation_members(conversation_id,user_id)
    values(v_conversation,v_me),(v_conversation,p_friend_id);
  end if;
  return v_conversation;
end;
$$;
revoke all on function public.create_or_get_direct_conversation(uuid) from public, anon;
grant execute on function public.create_or_get_direct_conversation(uuid) to authenticated;

create or replace function public.send_friend_request(p_username text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_sender uuid := auth.uid();
  v_recipient uuid;
  v_existing uuid;
  q text := lower(trim(coalesce(p_username,'')));
  v_matches integer;
begin
  if v_sender is null then raise exception 'Entre na sua conta para adicionar amigos.' using errcode = '42501'; end if;
  if q = '' then raise exception 'Digite um nome, usuário ou K-Code.'; end if;

  select count(*) into v_matches
  from public.profiles p
  where p.id <> v_sender
    and (
      lower(coalesce(p.k_code,'')) = q
      or lower(coalesce(p.username,'')) = q
      or lower(coalesce(p.kx_mail,'')) = q
      or lower(coalesce(p.display_name,'')) = q
    );
  if v_matches = 0 then raise exception 'Não encontramos essa conta.'; end if;
  if v_matches > 1 then raise exception 'Encontramos mais de uma conta com esse nome. Use o K-Code para localizar a pessoa certa.'; end if;

  select id into v_recipient from public.profiles p
  where p.id <> v_sender
    and (
      lower(coalesce(p.k_code,'')) = q
      or lower(coalesce(p.username,'')) = q
      or lower(coalesce(p.kx_mail,'')) = q
      or lower(coalesce(p.display_name,'')) = q
    )
  limit 1;

  if not private.can_interact_with_user(v_recipient) then
    raise exception 'Não é possível enviar uma solicitação para esta conta.' using errcode = '42501';
  end if;
  if exists(select 1 from public.friendships where user_a=least(v_sender,v_recipient) and user_b=greatest(v_sender,v_recipient)) then return 'already_friends'; end if;
  select id into v_existing from public.friend_requests where sender_id=v_recipient and recipient_id=v_sender and status='pending' limit 1;
  if v_existing is not null then
    update public.friend_requests set status='accepted',updated_at=now() where id=v_existing;
    insert into public.friendships(user_a,user_b) values(least(v_sender,v_recipient),greatest(v_sender,v_recipient)) on conflict do nothing;
    return 'accepted_existing_request';
  end if;
  insert into public.friend_requests(sender_id,recipient_id,status) values(v_sender,v_recipient,'pending')
  on conflict(sender_id,recipient_id) do update set status='pending',updated_at=now();
  return 'request_sent';
end;
$$;
revoke all on function public.send_friend_request(text) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;

create or replace function public.respond_friend_request(p_request_id uuid,p_accept boolean)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_sender uuid;
  v_recipient uuid;
  v_status text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  select sender_id,recipient_id,status into v_sender,v_recipient,v_status
  from public.friend_requests where id=p_request_id for update;
  if v_recipient is null or v_recipient <> auth.uid() then raise exception 'Solicitação não encontrada.'; end if;
  if v_status <> 'pending' then return v_status; end if;
  if p_accept and not private.can_interact_with_user(v_sender) then
    raise exception 'Não é possível aceitar uma solicitação desta conta.' using errcode = '42501';
  end if;
  update public.friend_requests set status=case when p_accept then 'accepted' else 'rejected' end,updated_at=now()
  where id=p_request_id;
  if p_accept then
    insert into public.friendships(user_a,user_b)
    values(least(v_sender,v_recipient),greatest(v_sender,v_recipient))
    on conflict do nothing;
    return 'accepted';
  end if;
  return 'rejected';
end;
$$;
revoke all on function public.respond_friend_request(uuid,boolean) from public, anon;
grant execute on function public.respond_friend_request(uuid,boolean) to authenticated;
