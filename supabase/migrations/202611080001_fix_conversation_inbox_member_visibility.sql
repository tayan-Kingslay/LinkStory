create policy "members_read_conversation_peers"
on public.conversation_members
for select
to authenticated
using (
  private.is_conversation_member(conversation_id)
  and not private.conversation_has_blocked_participant(conversation_id)
);
