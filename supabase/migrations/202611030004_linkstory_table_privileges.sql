-- LinkStory hardening: browser roles must not receive DDL-like table privileges.
-- RLS does not protect TRUNCATE, and clients never need to create triggers
-- or declare foreign-key references through the public Data API.
revoke truncate, trigger, references
  on all tables in schema public
  from public, anon, authenticated;
