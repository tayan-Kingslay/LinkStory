-- LinkStory Guard: secure moderation queue and moderator authorization.
-- No moderator is granted automatically. An owner must add trusted UUIDs to private.linkstory_moderators
-- through the Supabase SQL editor after verifying their identity.
create table if not exists private.linkstory_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table private.linkstory_moderators enable row level security;
revoke all on private.linkstory_moderators from public, anon, authenticated;

create or replace function private.is_linkstory_moderator()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private
as $$
  select exists (
    select 1 from private.linkstory_moderators m
    where m.user_id = auth.uid() and m.active = true
  );
$$;
revoke all on function private.is_linkstory_moderator() from public, anon, authenticated;
grant execute on function private.is_linkstory_moderator() to authenticated;

-- Keep the accepted target types consistent with the client report form.
alter table public.content_reports drop constraint if exists content_reports_target_type_check;
alter table public.content_reports add constraint content_reports_target_type_check
  check (target_type in ('profile','post','photo','manga','chapter','page','comment','message'));

create or replace function public.linkstory_moderation_queue(p_status text default 'pending')
returns table (
  id uuid, reporter_id uuid, target_type text, target_id uuid, reason text,
  details text, status text, created_at timestamptz, reviewed_at timestamptz, resolution text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if auth.uid() is null or not private.is_linkstory_moderator() then
    raise exception 'Acesso restrito à equipe de moderação' using errcode = '42501';
  end if;
  if p_status not in ('pending','reviewing','actioned','dismissed','all') then
    raise exception 'Filtro inválido';
  end if;
  return query
    select r.id,r.reporter_id,r.target_type,r.target_id,r.reason,r.details,r.status,r.created_at,r.reviewed_at,r.resolution
    from public.content_reports r
    where p_status = 'all' or r.status = p_status
    order by r.created_at asc
    limit 200;
end;
$$;
revoke all on function public.linkstory_moderation_queue(text) from public, anon;
grant execute on function public.linkstory_moderation_queue(text) to authenticated;

create or replace function public.linkstory_review_report(
  p_report_id uuid,
  p_decision text,
  p_resolution text
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_report public.content_reports%rowtype;
begin
  if auth.uid() is null or not private.is_linkstory_moderator() then
    raise exception 'Acesso restrito à equipe de moderação' using errcode = '42501';
  end if;
  if p_decision not in ('reviewing','actioned','dismissed') then
    raise exception 'Decisão inválida';
  end if;
  if char_length(coalesce(p_resolution,'')) < 5 or char_length(p_resolution) > 2000 then
    raise exception 'Explique a decisão (5 a 2000 caracteres)';
  end if;
  select * into v_report from public.content_reports where id = p_report_id for update;
  if not found then raise exception 'Denúncia não encontrada'; end if;
  update public.content_reports
    set status = p_decision,
        reviewed_at = case when p_decision = 'reviewing' then null else now() end,
        resolution = p_resolution
    where id = p_report_id;
  if p_decision in ('actioned','dismissed') then
    insert into private.moderation_actions(report_id,target_type,target_id,action,reason,moderator_id)
    values (
      v_report.id,v_report.target_type,v_report.target_id,
      case when p_decision = 'actioned' then 'report_reviewed' else 'no_violation' end,
      p_resolution,auth.uid()
    );
  end if;
end;
$$;
revoke all on function public.linkstory_review_report(uuid,text,text) from public, anon;
grant execute on function public.linkstory_review_report(uuid,text,text) to authenticated;

comment on table private.linkstory_moderators is 'Allowlist of trusted moderators. Manage only through the Supabase SQL editor after identity verification.';
comment on function public.linkstory_review_report(uuid,text,text) is 'Records a moderation decision and audit trail. Does not itself delete content or ban accounts; those require a separate verified enforcement workflow.';

-- Harden manga visibility: allow creators to preview their own unpublished work,
-- moderators to review any item, and enforce the age gate for everyone else.
create or replace function private.can_view_manga_record(
  p_rating text,
  p_creator_id uuid,
  p_status text
) returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private, public
as $$
  select
    (
      auth.uid() is not null
      and (
        p_creator_id = auth.uid()
        and coalesce(p_status, '') <> 'published'
      )
    )
    or (
      auth.uid() is not null
      and private.is_linkstory_moderator()
    )
    or (
      coalesce(p_status, '') = 'published'
      and private.can_view_manga(p_rating)
    );
$$;
revoke all on function private.can_view_manga_record(text,uuid,text) from public, anon, authenticated;
grant execute on function private.can_view_manga_record(text,uuid,text) to anon, authenticated;

-- Remove legacy anonymous test-write policies found during the policy audit.
-- These policies allowed unauthenticated users to insert/update manga records and chapters/pages.
drop policy if exists mangas_public_test_insert on public.mangas;
drop policy if exists mangas_public_test_update on public.mangas;
drop policy if exists manga_chapters_public_test_insert on public.manga_chapters;
drop policy if exists manga_pages_public_test_insert on public.manga_pages;

-- Replace read policies with a shared server-side visibility decision.
drop policy if exists mangas_age_gated_read on public.mangas;
create policy mangas_age_gated_read on public.mangas
  for select to anon, authenticated
  using (private.can_view_manga_record(age_rating, creator_id, status));

drop policy if exists manga_chapters_age_gated_read on public.manga_chapters;
create policy manga_chapters_age_gated_read on public.manga_chapters
  for select to anon, authenticated
  using (exists (
    select 1 from public.mangas m
    where m.id = manga_chapters.manga_id
      and private.can_view_manga_record(m.age_rating, m.creator_id, m.status)
  ));

drop policy if exists manga_pages_age_gated_read on public.manga_pages;
create policy manga_pages_age_gated_read on public.manga_pages
  for select to anon, authenticated
  using (exists (
    select 1
    from public.manga_chapters c
    join public.mangas m on m.id = c.manga_id
    where c.id = manga_pages.chapter_id
      and private.can_view_manga_record(m.age_rating, m.creator_id, m.status)
  ));

-- Remove legacy anonymous write access to the media bucket.
drop policy if exists linkstory_media_test_anon_insert on storage.objects;
drop policy if exists linkstory_media_test_anon_update on storage.objects;

-- IMPORTANT: linkstory-media is currently a public bucket. Public object URLs bypass
-- database age-gating. Do not claim 18+ media is protected until a private-bucket /
-- signed-delivery migration is implemented and existing objects are migrated.


-- Prevent privilege escalation through user-editable signup metadata or profile updates.
-- New accounts always start as readers; account role changes require a trusted server/admin path.
create or replace function public.handle_linkstory_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  base_username text;
  candidate_username text;
  suffix text;
  display_name_value text;
  role_value public.account_role;
  kx_mail_value text;
begin
  display_name_value := left(coalesce(nullif(new.raw_user_meta_data ->> 'full_name',''),nullif(split_part(coalesce(new.email,''),'@',1),''),'Leitor'),80);
  base_username := lower(regexp_replace(coalesce(nullif(new.raw_user_meta_data ->> 'username',''),nullif(split_part(coalesce(new.email,''),'@',1),''),'usuario'),'[^a-zA-Z0-9_]','','g'));
  if char_length(base_username) < 3 then base_username := 'user' || substr(replace(new.id::text,'-',''),1,6); end if;
  base_username := left(base_username,25);
  candidate_username := base_username;
  while exists (select 1 from public.profiles p where p.username = candidate_username) loop
    suffix := substr(replace(gen_random_uuid()::text,'-',''),1,4);
    candidate_username := left(base_username,25) || '_' || suffix;
  end loop;
  role_value := 'leitor'::public.account_role;
  kx_mail_value := lower(coalesce(nullif(new.raw_user_meta_data ->> 'kx_mail',''),candidate_username || '@kx.mail'));
  insert into public.profiles (id,username,display_name,role,kx_id,kx_mail,recovery_email)
  values (new.id,candidate_username,display_name_value,role_value,public.make_linkstory_kx_id(new.id),kx_mail_value,nullif(new.raw_user_meta_data ->> 'recovery_email',''))
  on conflict (id) do update set kx_mail=coalesce(public.profiles.kx_mail,excluded.kx_mail);
  return new;
end;
$function$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres','service_role') then
    raise exception 'A alteração do tipo de conta exige autorização administrativa'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.prevent_profile_role_escalation() from public, anon, authenticated;
drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
before update of role on public.profiles
for each row execute function public.prevent_profile_role_escalation();

-- The creator helper may only answer for the current signed-in user.
create or replace function public.is_creator(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
  select auth.uid() is not null
    and uid = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role::text = 'criador'
    );
$function$;
revoke all on function public.is_creator(uuid) from public, anon;
grant execute on function public.is_creator(uuid) to authenticated;


-- Match the exact age labels emitted by the current publication form ("10 anos", etc.).
-- Unknown values remain denied; anonymous visitors can only view Livre content.
create or replace function private.can_view_manga(p_rating text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private, public, auth
as $$
  select case
    when upper(trim(coalesce(p_rating, ''))) in ('L','LIVRE') then true
    when auth.uid() is null then false
    when upper(trim(coalesce(p_rating, ''))) not in (
      '10','10+','10 ANOS','12','12+','12 ANOS',
      '14','14+','14 ANOS','16','16+','16 ANOS',
      '18','18+','18 ANOS'
    ) then false
    else exists (
      select 1
      from private.user_safety_settings s
      where s.user_id = auth.uid()
        and s.birth_date is not null
        and extract(year from age(current_date, s.birth_date)) >=
          case upper(trim(p_rating))
            when '10' then 10 when '10+' then 10 when '10 ANOS' then 10
            when '12' then 12 when '12+' then 12 when '12 ANOS' then 12
            when '14' then 14 when '14+' then 14 when '14 ANOS' then 14
            when '16' then 16 when '16+' then 16 when '16 ANOS' then 16
            when '18' then 18 when '18+' then 18 when '18 ANOS' then 18
          end
        and (
          upper(trim(p_rating)) not in ('18','18+','18 ANOS')
          or s.adult_content_enabled = true
        )
    )
  end;
$$;
revoke all on function private.can_view_manga(text) from public;
grant execute on function private.can_view_manga(text) to anon, authenticated;
