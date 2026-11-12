-- Harden and optimize direct-message access policies.
revoke all on function public.hide_direct_message_for_me(uuid) from public, anon;
revoke all on function public.delete_direct_message_for_everyone(uuid) from public, anon;
revoke all on function public.edit_direct_message(uuid,text) from public, anon;
grant execute on function public.hide_direct_message_for_me(uuid) to authenticated;
grant execute on function public.delete_direct_message_for_everyone(uuid) to authenticated;
grant execute on function public.edit_direct_message(uuid,text) to authenticated;

drop policy if exists messages_member_read on public.messages;
create policy messages_member_read on public.messages
for select to authenticated using (
 exists(
   select 1 from public.conversation_members cm
   where cm.conversation_id=messages.conversation_id
     and cm.user_id=(select auth.uid())
 )
 and not exists(
   select 1 from public.message_user_deletions d
   where d.message_id=messages.id and d.user_id=(select auth.uid())
 )
);

drop policy if exists messages_member_insert on public.messages;
create policy messages_member_insert on public.messages
for insert to authenticated with check (
 sender_id=(select auth.uid())
 and exists(
   select 1 from public.conversation_members cm
   where cm.conversation_id=messages.conversation_id
     and cm.user_id=(select auth.uid())
 )
);

drop policy if exists message_user_deletions_read_own on public.message_user_deletions;
create policy message_user_deletions_read_own on public.message_user_deletions
for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists message_user_deletions_insert_own on public.message_user_deletions;
create policy message_user_deletions_insert_own on public.message_user_deletions
for insert to authenticated with check (user_id=(select auth.uid()));
