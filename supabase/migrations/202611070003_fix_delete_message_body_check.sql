-- Fix delete-for-everyone: messages.body has a 1..5000 character CHECK.
create or replace function public.delete_direct_message_for_everyone(p_message_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
 update public.messages m
 set body='Mensagem apagada.', deleted_for_all_at=now()
 where m.id=p_message_id and m.sender_id=auth.uid()
 and m.deleted_for_all_at is null
 and exists(select 1 from public.conversation_members cm where cm.conversation_id=m.conversation_id and cm.user_id=auth.uid());
 if not found then raise exception 'Só é possível apagar para todos uma mensagem sua.'; end if;
end; $$;
revoke all on function public.delete_direct_message_for_everyone(uuid) from public, anon;
grant execute on function public.delete_direct_message_for_everyone(uuid) to authenticated;
