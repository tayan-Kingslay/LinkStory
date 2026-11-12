create table if not exists public.manga_collaborators (
  id uuid primary key default gen_random_uuid(),
  manga_id uuid not null references public.mangas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('Roteirista','Ilustrador','Colorista','Designer','Editor','Revisor','Assistente','Outro')),
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint manga_collaborators_no_self check (user_id <> invited_by),
  constraint manga_collaborators_unique_person unique (manga_id,user_id)
);
create index if not exists manga_collaborators_user_status_idx on public.manga_collaborators(user_id,status,created_at desc);
create index if not exists manga_collaborators_manga_status_idx on public.manga_collaborators(manga_id,status,created_at);
alter table public.manga_collaborators enable row level security;
revoke all on public.manga_collaborators from anon, authenticated;
grant select on public.manga_collaborators to anon, authenticated;
grant insert (manga_id,user_id,invited_by,role) on public.manga_collaborators to authenticated;
grant update (status,responded_at) on public.manga_collaborators to authenticated;
grant delete on public.manga_collaborators to authenticated;
drop policy if exists manga_collaborators_read on public.manga_collaborators;
create policy manga_collaborators_read on public.manga_collaborators
for select to anon, authenticated
using (status = 'accepted' or (select auth.uid()) = user_id or (select auth.uid()) = invited_by);
drop policy if exists manga_collaborators_invite_owner on public.manga_collaborators;
create policy manga_collaborators_invite_owner on public.manga_collaborators
for insert to authenticated
with check (
  invited_by = (select auth.uid())
  and exists (select 1 from public.mangas m where m.id = manga_id and m.creator_id = (select auth.uid()))
);
drop policy if exists manga_collaborators_respond_invite on public.manga_collaborators;
create policy manga_collaborators_respond_invite on public.manga_collaborators
for update to authenticated
using (user_id = (select auth.uid()) and status = 'pending')
with check (user_id = (select auth.uid()) and status in ('accepted','declined'));
drop policy if exists manga_collaborators_owner_delete on public.manga_collaborators;
create policy manga_collaborators_owner_delete on public.manga_collaborators
for delete to authenticated
using (exists (select 1 from public.mangas m where m.id = manga_id and m.creator_id = (select auth.uid())));
