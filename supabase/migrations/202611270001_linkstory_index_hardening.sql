-- LinkStory: cover the remaining foreign-key lookup paths and remove one redundant unique index.
create index if not exists verification_audit_actor_id_idx
  on private.verification_audit (actor_id);
create index if not exists verification_audit_request_id_idx
  on private.verification_audit (request_id);
create index if not exists verification_audit_target_user_id_idx
  on private.verification_audit (target_user_id);
create index if not exists creator_applications_reviewed_by_idx
  on public.creator_applications (reviewed_by);
create index if not exists idea_collaborations_creator_id_idx
  on public.idea_collaborations (creator_id);
create index if not exists manga_collaborators_invited_by_idx
  on public.manga_collaborators (invited_by);
create index if not exists message_user_deletions_user_id_idx
  on public.message_user_deletions (user_id);
create index if not exists notifications_post_id_idx
  on public.notifications (post_id);
create index if not exists reading_progress_chapter_id_idx
  on public.reading_progress (chapter_id);
create index if not exists reading_progress_manga_id_idx
  on public.reading_progress (manga_id);
create index if not exists verification_applications_reviewed_by_idx
  on public.verification_applications (reviewed_by);
create index if not exists verification_requests_reviewed_by_idx
  on public.verification_requests (reviewed_by);
create index if not exists verified_badges_assigned_by_idx
  on public.verified_badges (assigned_by);

-- This duplicate is not constraint-backed; the canonical unique constraint remains intact.
drop index if exists public.manga_chapters_manga_number_uq;
