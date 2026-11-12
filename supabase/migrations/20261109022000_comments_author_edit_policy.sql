drop policy if exists comments_own_update on public.comments;
create policy comments_own_update
on public.comments
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);
