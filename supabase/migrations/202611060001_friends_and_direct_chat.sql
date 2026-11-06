create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_not_self check (sender_id <> recipient_id),
  constraint friend_requests_pair_unique unique (sender_id, recipient_id)
);
create index if not exists friend_requests_recipient_status_idx on public.friend_requests(recipient_id,status,created_at desc);
create index if not exists friend_requests_sender_status_idx on public.friend_requests(sender_id,status,created_at desc);
create table if not exists public.friendships (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_pair_order check (user_a < user_b),
  primary key (user_a,user_b)
);
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
drop policy if exists friend_requests_read_participants on public.friend_requests;
create policy friend_requests_read_participants on public.friend_requests for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists friendships_read_participants on public.friendships;
create policy friendships_read_participants on public.friendships for select to authenticated using (auth.uid() = user_a or auth.uid() = user_b);
create or replace function public.send_friend_request(p_username text) returns text language plpgsql security definer set search_path=public as $$
declare v_sender uuid:=auth.uid(); v_recipient uuid; v_existing uuid;
begin
 if v_sender is null then raise exception 'Entre na sua conta para adicionar amigos.'; end if;
 select id into v_recipient from public.profiles where lower(username)=lower(trim(p_username)) or lower(coalesce(kx_mail,''))=lower(trim(p_username)) limit 1;
 if v_recipient is null then raise exception 'Não encontramos essa conta.'; end if;
 if v_recipient=v_sender then raise exception 'Você não pode adicionar a si mesmo.'; end if;
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
end; $$;
create or replace function public.respond_friend_request(p_request_id uuid,p_accept boolean) returns text language plpgsql security definer set search_path=public as $$
declare v_sender uuid; v_recipient uuid; v_status text;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
 select sender_id,recipient_id,status into v_sender,v_recipient,v_status from public.friend_requests where id=p_request_id for update;
 if v_recipient is null or v_recipient<>auth.uid() then raise exception 'Solicitação não encontrada.'; end if;
 if v_status<>'pending' then return v_status; end if;
 update public.friend_requests set status=case when p_accept then 'accepted' else 'rejected' end,updated_at=now() where id=p_request_id;
 if p_accept then
  insert into public.friendships(user_a,user_b) values(least(v_sender,v_recipient),greatest(v_sender,v_recipient)) on conflict do nothing;
  return 'accepted';
 end if;
 return 'rejected';
end; $$;
create or replace function public.create_or_get_direct_conversation(p_friend_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare v_me uuid:=auth.uid(); v_conversation uuid;
begin
 if v_me is null then raise exception 'Entre na sua conta.'; end if;
 if p_friend_id is null or p_friend_id=v_me then raise exception 'Amigo inválido.'; end if;
 if not exists(select 1 from public.friendships where user_a=least(v_me,p_friend_id) and user_b=greatest(v_me,p_friend_id)) then raise exception 'Vocês precisam ser amigos para iniciar uma conversa.'; end if;
 select c.id into v_conversation from public.conversations c
 join public.conversation_members mine on mine.conversation_id=c.id and mine.user_id=v_me
 join public.conversation_members other on other.conversation_id=c.id and other.user_id=p_friend_id
 where (select count(*) from public.conversation_members cm where cm.conversation_id=c.id)=2
 order by c.created_at desc limit 1;
 if v_conversation is null then
  insert into public.conversations default values returning id into v_conversation;
  insert into public.conversation_members(conversation_id,user_id) values(v_conversation,v_me),(v_conversation,p_friend_id);
 end if;
 return v_conversation;
end; $$;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid,boolean) to authenticated;
grant execute on function public.create_or_get_direct_conversation(uuid) to authenticated;
