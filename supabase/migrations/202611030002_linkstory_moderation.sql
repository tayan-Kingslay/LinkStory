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
      case when p_decision = 'actioned' then 'content_removed' else 'no_violation' end,
      p_resolution,auth.uid()
    );
  end if;
end;
$$;
revoke all on function public.linkstory_review_report(uuid,text,text) from public, anon;
grant execute on function public.linkstory_review_report(uuid,text,text) to authenticated;

comment on table private.linkstory_moderators is 'Allowlist of trusted moderators. Manage only through the Supabase SQL editor after identity verification.';
comment on function public.linkstory_review_report(uuid,text,text) is 'Records a moderation decision and audit trail. Does not itself delete content or ban accounts; those require a separate verified enforcement workflow.';
