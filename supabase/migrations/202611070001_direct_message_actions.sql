-- Direct-message actions: per-user hide, sender edit, and delete for everyone.
create table if not exists public.message_user_deletions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  primary key (message_id,user_id)
);
alter table public.message_user_deletions enable row level security;
drop policy if exists message_user_deletions_read_own on public.message_user_deletions;
create policy message_user_deletions_read_own on public.message_user_deletions for select to authenticated using (user_id=auth.uid());
drop policy if exists message_user_deletions_insert_own on public.message_user_deletions;
create policy message_user_deletions_insert_own on public.message_user_deletions for insert to authenticated with check (user_id=auth.uid());

alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists deleted_for_all_at timestamptz;
drop policy if exists messages_member_read on public.messages;
create policy messages_member_read on public.messages for select to authenticated using (
 exists(select 1 from public.conversation_members cm where cm.conversation_id=messages.conversation_id and cm.user_id=auth.uid())
 and not exists(select 1 from public.message_user_deletions d where d.message_id=messages.id and d.user_id=auth.uid())
);

create or replace function public.hide_direct_message_for_me(p_message_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_conversation uuid;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
 select conversation_id into v_conversation from public.messages where id=p_message_id;
 if v_conversation is null or not exists(select 1 from public.conversation_members where conversation_id=v_conversation and user_id=auth.uid()) then raise exception 'Mensagem não encontrada.'; end if;
 insert into public.message_user_deletions(message_id,user_id) values(p_message_id,auth.uid()) on conflict do nothing;
end; $$;

create or replace function public.delete_direct_message_for_everyone(p_message_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
 update public.messages m set body='',deleted_for_all_at=now()
 where m.id=p_message_id and m.sender_id=auth.uid()
 and exists(select 1 from public.conversation_members cm where cm.conversation_id=m.conversation_id and cm.user_id=auth.uid());
 if not found then raise exception 'Só é possível apagar para todos uma mensagem sua.'; end if;
end; $$;

create or replace function public.edit_direct_message(p_message_id uuid,p_body text)
returns void language plpgsql security definer set search_path=public as $$
declare v_body text:=btrim(coalesce(p_body,''));
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
 if v_body='' or length(v_body)>5000 then raise exception 'A mensagem deve ter entre 1 e 5000 caracteres.'; end if;
 update public.messages m set body=v_body,edited_at=now()
 where m.id=p_message_id and m.sender_id=auth.uid() and m.deleted_for_all_at is null
 and exists(select 1 from public.conversation_members cm where cm.conversation_id=m.conversation_id and cm.user_id=auth.uid());
 if not found then raise exception 'Não foi possível editar esta mensagem.'; end if;
end; $$;
grant execute on function public.hide_direct_message_for_me(uuid) to authenticated;
grant execute on function public.delete_direct_message_for_everyone(uuid) to authenticated;
grant execute on function public.edit_direct_message(uuid,text) to authenticated;
