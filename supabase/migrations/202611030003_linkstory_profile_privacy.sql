-- LinkStory Guard: protect private profile columns and enforce profile visibility.
-- Public profile reads are limited to presentation fields; account-private fields
-- are returned only to the authenticated owner through a SECURITY DEFINER RPC.

create or replace function private.can_view_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private, auth
as $$
  select p_user_id is not null
     and (
       p_user_id = auth.uid()
       or coalesce(
         (select s.profile_visibility
            from private.user_safety_settings s
           where s.user_id = p_user_id),
         'public'
       ) = 'public'
     );
$$;
revoke all on function private.can_view_profile(uuid) from public;
grant execute on function private.can_view_profile(uuid) to anon, authenticated;

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_visibility_read
  on public.profiles
  for select to anon, authenticated
  using (private.can_view_profile(id));

-- Do not expose recovery email, KX identifiers, or private preferences through
-- ordinary table reads. Keep the public profile fields needed by profile cards
-- and creator attribution available to both signed-out and signed-in visitors.
revoke select on table public.profiles from public, anon, authenticated;
grant select (
  id, username, display_name, role, bio, avatar_url, created_at, updated_at
) on table public.profiles to anon, authenticated;

create or replace function public.get_my_linkstory_private_profile()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select jsonb_build_object(
    'kx_id', p.kx_id,
    'kx_mail', p.kx_mail,
    'recovery_email', p.recovery_email,
    'preferences', coalesce(p.preferences, '{}'::jsonb)
  )
  from public.profiles p
  where p.id = auth.uid();
$$;
revoke all on function public.get_my_linkstory_private_profile() from public, anon;
grant execute on function public.get_my_linkstory_private_profile() to authenticated;

-- Account identifiers are system-managed. Profile owners may still edit
-- presentation fields and their own preferences/recovery email.
create or replace function public.prevent_profile_identifier_tampering()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if current_user not in ('postgres', 'service_role') and (
       new.id is distinct from old.id
    or new.kx_id is distinct from old.kx_id
    or new.kx_mail is distinct from old.kx_mail
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Identificadores da conta são gerenciados pelo LinkStory'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.prevent_profile_identifier_tampering() from public, anon, authenticated;
drop trigger if exists prevent_profile_identifier_tampering on public.profiles;
create trigger prevent_profile_identifier_tampering
before update on public.profiles
for each row execute function public.prevent_profile_identifier_tampering();
