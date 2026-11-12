-- Restrict direct table access; submissions and reports are user-owned and reviewed through trusted server-side paths.
revoke all on table public.content_reports from anon, authenticated;
grant insert on table public.content_reports to authenticated;

revoke all on table public.creator_applications from anon, authenticated;
grant select, insert on table public.creator_applications to authenticated;
