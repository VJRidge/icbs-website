-- Newsletter issues: store block document (page/post parity); body_* remain compiled send payload.

alter table public.newsletter_issues
  add column if not exists document jsonb not null default '{"format":"blocks","blocks":[]}'::jsonb;
