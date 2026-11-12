
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.linkstory_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table private.linkstory_moderators
  add column if not exists is_admin boolean not null default false;
alter table private.linkstory_moderators enable row level security;
revoke all on table private.linkstory_moderators from public, anon, authenticated;

create or replace function private.is_linkstory_moderator()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.linkstory_moderators m
    where m.user_id = auth.uid() and m.active = true
  );
$$;
revoke all on function private.is_linkstory_moderator() from public, anon, authenticated;

create or replace function private.is_linkstory_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.linkstory_moderators m
    where m.user_id = auth.uid() and m.active = true and m.is_admin = true
  );
$$;
revoke all on function private.is_linkstory_admin() from public, anon, authenticated;

alter table public.profiles add column if not exists verification_type text;
alter table public.profiles drop constraint if exists profiles_verification_type_check;
alter table public.profiles add constraint profiles_verification_type_check
  check (verification_type is null or verification_type in ('influencer','kairox'));
grant select (verification_type) on table public.profiles to anon, authenticated;

update public.profiles p
set verification_type = vb.badge_type
from public.verified_badges vb
where vb.user_id = p.id
  and p.verification_type is null
  and vb.badge_type in ('influencer','kairox');

create or replace function private.prevent_verification_tampering()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres','service_role') then
    if tg_op = 'INSERT' and new.verification_type is not null then
      raise exception 'Selos de verificação são gerenciados pela administração' using errcode = '42501';
    elsif tg_op = 'UPDATE' and new.verification_type is distinct from old.verification_type then
      raise exception 'Selos de verificação são gerenciados pela administração' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_verification_tampering() from public, anon, authenticated;
drop trigger if exists prevent_verification_tampering on public.profiles;
create trigger prevent_verification_tampering
before insert or update of verification_type on public.profiles
for each row execute function private.prevent_verification_tampering();

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_type text not null default 'influencer' check (requested_type = 'influencer'),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  follower_count integer not null check (follower_count >= 0),
  note text check (note is null or char_length(note) <= 1000),
  admin_note text check (admin_note is null or char_length(admin_note) <= 1000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists verification_requests_one_pending
  on public.verification_requests (user_id) where status = 'pending';
create index if not exists verification_requests_status_idx
  on public.verification_requests (status, created_at);
alter table public.verification_requests enable row level security;
revoke all on table public.verification_requests from public, anon, authenticated;
grant select on table public.verification_requests to authenticated;
drop policy if exists verification_requests_select_own on public.verification_requests;
create policy verification_requests_select_own
  on public.verification_requests for select to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists private.verification_audit (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  request_id uuid references public.verification_requests(id) on delete set null,
  action text not null check (action in ('approved','rejected','assigned','removed')),
  previous_type text,
  new_type text,
  note text,
  created_at timestamptz not null default now()
);
alter table private.verification_audit enable row level security;
revoke all on table private.verification_audit from public, anon, authenticated;

create or replace function private.linkstory_follower_count(p_user_id uuid)
returns bigint
language sql stable security definer
set search_path = ''
as $$
  select count(*)::bigint from public.follows f where f.following_id = p_user_id;
$$;
revoke all on function private.linkstory_follower_count(uuid) from public, anon, authenticated;

create or replace function public.get_my_verification_status()
returns table (
  verification_type text,
  follower_count bigint,
  required_followers integer,
  request_status text,
  request_created_at timestamptz,
  admin_note text
)
language plpgsql stable security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Entre na sua conta para consultar a verificação.' using errcode = '42501';
  end if;
  return query
    select p.verification_type,
           private.linkstory_follower_count(uid),
           10000,
           r.status,
           r.created_at,
           r.admin_note
    from public.profiles p
    left join lateral (
      select vr.status, vr.created_at, vr.admin_note
      from public.verification_requests vr
      where vr.user_id = uid
      order by vr.created_at desc limit 1
    ) r on true
    where p.id = uid;
end;
$$;
revoke all on function public.get_my_verification_status() from public, anon;
grant execute on function public.get_my_verification_status() to authenticated;

create or replace function public.request_influencer_verification(p_note text default null)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  cur_type text;
  followers bigint;
  new_id uuid;
begin
  if uid is null then
    raise exception 'Entre na sua conta para solicitar a verificação.' using errcode = '42501';
  end if;
  select p.verification_type into cur_type from public.profiles p where p.id = uid;
  if not found then raise exception 'Perfil não encontrado.'; end if;
  if cur_type is not null then raise exception 'Sua conta já possui um selo de verificação.'; end if;
  followers := private.linkstory_follower_count(uid);
  if followers < 10000 then
    raise exception 'Você precisa de pelo menos 10.000 seguidores para solicitar (atual: %).', followers;
  end if;
  begin
    insert into public.verification_requests (user_id, follower_count, note)
    values (uid, followers::integer, nullif(left(btrim(coalesce(p_note,'')), 1000), ''))
    returning id into new_id;
  exception when unique_violation then
    raise exception 'Você já tem uma solicitação em análise.';
  end;
  return new_id;
end;
$$;
revoke all on function public.request_influencer_verification(text) from public, anon;
grant execute on function public.request_influencer_verification(text) to authenticated;

create or replace function public.linkstory_verification_queue(p_status text default 'pending')
returns table (
  id uuid, user_id uuid, username text, display_name text, k_code text,
  follower_count integer, current_followers bigint, note text, status text,
  admin_note text, created_at timestamptz, reviewed_at timestamptz
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_linkstory_admin() then
    raise exception 'Acesso restrito à administração' using errcode = '42501';
  end if;
  if p_status not in ('pending','approved','rejected','all') then raise exception 'Filtro inválido'; end if;
  return query
    select r.id, r.user_id, p.username, p.display_name, p.k_code,
           r.follower_count, private.linkstory_follower_count(r.user_id),
           r.note, r.status, r.admin_note, r.created_at, r.reviewed_at
    from public.verification_requests r
    join public.profiles p on p.id = r.user_id
    where p_status = 'all' or r.status = p_status
    order by r.created_at asc limit 200;
end;
$$;
revoke all on function public.linkstory_verification_queue(text) from public, anon;
grant execute on function public.linkstory_verification_queue(text) to authenticated;

create or replace function public.linkstory_review_verification(
  p_request_id uuid, p_approve boolean, p_admin_note text default null
)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  req public.verification_requests%rowtype;
  prev text;
  note_value text := nullif(left(btrim(coalesce(p_admin_note,'')), 1000), '');
  followers bigint;
begin
  if auth.uid() is null or not private.is_linkstory_admin() then
    raise exception 'Acesso restrito à administração' using errcode = '42501';
  end if;
  select * into req from public.verification_requests where id = p_request_id for update;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if req.status <> 'pending' then raise exception 'Esta solicitação já foi analisada.'; end if;
  select p.verification_type into prev from public.profiles p where p.id = req.user_id;
  if p_approve then
    followers := private.linkstory_follower_count(req.user_id);
    if followers < 10000 then
      raise exception 'A conta não possui mais 10.000 seguidores no momento da aprovação.';
    end if;
    if prev is not null then
      raise exception 'A conta já possui outro selo de verificação.';
    end if;
    update public.profiles set verification_type = 'influencer' where id = req.user_id;
  end if;
  update public.verification_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         admin_note = note_value, reviewed_by = auth.uid(), reviewed_at = now()
   where id = req.id;
  insert into private.verification_audit (target_user_id, actor_id, request_id, action, previous_type, new_type, note)
  values (req.user_id, auth.uid(), req.id,
          case when p_approve then 'approved' else 'rejected' end,
          prev, case when p_approve then 'influencer' else prev end, note_value);
  return case when p_approve then 'approved' else 'rejected' end;
end;
$$;
revoke all on function public.linkstory_review_verification(uuid, boolean, text) from public, anon;
grant execute on function public.linkstory_review_verification(uuid, boolean, text) to authenticated;

create or replace function public.linkstory_set_verification(
  p_user_id uuid, p_type text, p_note text default null
)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  prev text;
  note_value text := nullif(left(btrim(coalesce(p_note,'')), 1000), '');
begin
  if auth.uid() is null or not private.is_linkstory_admin() then
    raise exception 'Acesso restrito à administração' using errcode = '42501';
  end if;
  if p_type is not null and p_type not in ('influencer','kairox') then raise exception 'Tipo de selo inválido.'; end if;
  select p.verification_type into prev from public.profiles p where p.id = p_user_id;
  if not found then raise exception 'Usuário não encontrado.'; end if;
  update public.profiles set verification_type = p_type where id = p_user_id;
  insert into private.verification_audit (target_user_id, actor_id, action, previous_type, new_type, note)
  values (p_user_id, auth.uid(), case when p_type is null then 'removed' else 'assigned' end, prev, p_type, note_value);
  return coalesce(p_type, 'removed');
end;
$$;
revoke all on function public.linkstory_set_verification(uuid, text, text) from public, anon;
grant execute on function public.linkstory_set_verification(uuid, text, text) to authenticated;

create or replace function public.linkstory_admin_lookup_profile(p_query text)
returns table (
  id uuid, username text, display_name text, k_code text,
  verification_type text, followers bigint
)
language plpgsql stable security definer
set search_path = ''
as $$
declare q text := lower(btrim(regexp_replace(coalesce(p_query,''), '^@', '')));
begin
  if auth.uid() is null or not private.is_linkstory_admin() then
    raise exception 'Acesso restrito à administração' using errcode = '42501';
  end if;
  if length(q) < 2 then return; end if;
  return query
    select p.id, p.username, p.display_name, p.k_code, p.verification_type,
           private.linkstory_follower_count(p.id)
    from public.profiles p
    where lower(coalesce(p.k_code,'')) = q or lower(coalesce(p.username,'')) = q
    limit 5;
end;
$$;
revoke all on function public.linkstory_admin_lookup_profile(text) from public, anon;
grant execute on function public.linkstory_admin_lookup_profile(text) to authenticated;

comment on table private.linkstory_moderators is
  'Allowlist of LinkStory moderators; is_admin is a separate explicit privilege.';
comment on function public.linkstory_set_verification(uuid,text,text) is
  'Only explicitly designated LinkStory administrators can assign or remove verification badges.';
