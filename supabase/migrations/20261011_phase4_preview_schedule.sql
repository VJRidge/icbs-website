-- Phase 4b: secure remote previews and durable schedule outbox.

create table if not exists public.content_previews (
  id           uuid primary key default gen_random_uuid(),
  token        text not null unique,
  content_id   uuid references public.contents (id) on delete set null,
  title        text not null,
  document     jsonb not null,
  post_meta    jsonb,
  created_by   uuid references public.profiles (id),
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  check (jsonb_typeof(document) = 'object'),
  check (post_meta is null or jsonb_typeof(post_meta) = 'object')
);

create index if not exists content_previews_expires_idx
  on public.content_previews (expires_at);
create index if not exists content_previews_content_idx
  on public.content_previews (content_id);

alter table public.content_previews enable row level security;
revoke all on public.content_previews from public, anon, authenticated;

-- Staff never read preview rows from the browser client. Token mint/read uses
-- the service-role API after JWT + capability checks.

create table if not exists public.content_publish_jobs (
  id            uuid primary key default gen_random_uuid(),
  content_id    uuid not null references public.contents (id) on delete cascade,
  scheduled_for timestamptz not null,
  status        text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  attempts      int not null default 0 check (attempts >= 0),
  last_error    text,
  locked_at     timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (content_id, scheduled_for)
);

create index if not exists content_publish_jobs_due_idx
  on public.content_publish_jobs (status, scheduled_for);

alter table public.content_publish_jobs enable row level security;
revoke all on public.content_publish_jobs from public, anon;
grant select, insert, update on public.content_publish_jobs to authenticated;

drop policy if exists content_publish_jobs_staff on public.content_publish_jobs;
create policy content_publish_jobs_staff on public.content_publish_jobs
  for all to authenticated
  using (public.has_staff_capability('content.publish'))
  with check (public.has_staff_capability('content.publish'));

comment on table public.content_previews is
  'Expiring staff-minted preview snapshots. Public access is tokenized via API only.';
comment on table public.content_publish_jobs is
  'Durable outbox for scheduled publishes. Cron workers promote due rows idempotently.';

-- Extend relationship allow-lists to the approved workflow set (additive; keep Phase 3 seeds).
insert into public.content_relationship_types (
  key, source_label, target_label, allowed_source_types, allowed_target_types, max_targets
)
values
  ('related_resource', 'Related resource', 'Related from', array['page','post','tool_review','interview','event'], array['resource','tool_review','post'], null),
  ('lead_magnet', 'Lead magnet', 'Offered by', array['page','post','tool_review','resource'], array['resource'], 3),
  ('newsletter_inclusion', 'Newsletter inclusion', 'Included in', array['post','tool_review','resource','interview'], array['post','tool_review','resource'], null),
  ('campaign', 'Campaign', 'Campaign item', array['page','post'], array['page','post','resource','event'], null),
  ('author_sponsor', 'Author or sponsor', 'Featured in', array['post','tool_review','interview','event'], array['sponsor_profile'], 5),
  ('replacement_asset', 'Replacement asset', 'Replaces', array['resource'], array['resource'], 1)
on conflict (key) do nothing;

-- Scheduled rows must always carry a due timestamp.
alter table public.contents
  drop constraint if exists contents_scheduled_requires_time;
alter table public.contents
  add constraint contents_scheduled_requires_time check (
    status <> 'scheduled' or scheduled_for is not null
  );
