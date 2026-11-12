
create or replace function public.assign_influencer_badge_on_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_type text;
  current_followers bigint;
begin
  if new.status = 'approved' and old.status is distinct from new.status then
    current_followers := private.linkstory_follower_count(new.user_id);
    if current_followers < 10000 then
      raise exception 'A conta não possui mais 10.000 seguidores no momento da aprovação.';
    end if;

    select p.verification_type into existing_type
    from public.profiles p
    where p.id = new.user_id
    for update;

    if existing_type is not null and existing_type <> 'influencer' then
      raise exception 'A conta já possui outro selo de verificação.';
    end if;

    update public.profiles
       set verification_type = 'influencer'
     where id = new.user_id and verification_type is null;

    insert into public.verified_badges(user_id,badge_type,assigned_by)
    values(new.user_id,'influencer',new.reviewed_by)
    on conflict(user_id) do update
      set badge_type='influencer',assigned_at=now(),assigned_by=new.reviewed_by
      where public.verified_badges.badge_type='influencer';
  end if;
  return new;
end;
$$;
revoke all on function public.assign_influencer_badge_on_approval() from public, anon, authenticated;
