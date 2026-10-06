-- Phase 8a: Newsletter issues + send outbox + provider event log.
-- Recipients come from contacts (marketing_ok, not suppressed). Kit subscribers untouched.

create table if not exists public.newsletter_issues (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null default '',
  preview_text     text not null default '',
  body_html        text not null default '',
  body_text        text not null default '',
  status           text not null default 'draft',
  scheduled_for    timestamptz,
  sent_at          timestamptz,
  recipient_count  int not null default 0,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint newsletter_issues_status_check
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled'))
);

create index if not exists newsletter_issues_schedule_idx
  on public.newsletter_issues (status, scheduled_for)
  where status = 'scheduled';

create table if not exists public.newsletter_send_jobs (
  id                   uuid primary key default gen_random_uuid(),
  issue_id             uuid not null references public.newsletter_issues (id) on delete cascade,
  contact_id           uuid not null references public.contacts (id) on delete cascade,
  idempotency_key      text not null,
  status               text not null default 'pending',
  attempts             int not null default 0,
  max_attempts         int not null default 5,
  next_attempt_at      timestamptz not null default now(),
  last_error           text,
  provider_message_id  text,
  sent_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint newsletter_send_jobs_idempotency_uidx unique (idempotency_key),
  constraint newsletter_send_jobs_status_check
    check (status in ('pending', 'processing', 'sent', 'failed', 'skipped'))
);

create index if not exists newsletter_send_jobs_claim_idx
  on public.newsletter_send_jobs (status, next_attempt_at)
  where status in ('pending', 'processing');

create table if not exists public.newsletter_provider_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null default 'resend',
  event_type   text not null,
  email        citext,
  contact_id   uuid references public.contacts (id) on delete set null,
  issue_id     uuid references public.newsletter_issues (id) on delete set null,
  payload      jsonb not null default '{}'::jsonb,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists newsletter_provider_events_email_idx
  on public.newsletter_provider_events (email, occurred_at desc);

alter table public.newsletter_issues enable row level security;
alter table public.newsletter_send_jobs enable row level security;
alter table public.newsletter_provider_events enable row level security;

drop policy if exists newsletter_issues_staff on public.newsletter_issues;
create policy newsletter_issues_staff on public.newsletter_issues
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists newsletter_send_jobs_staff on public.newsletter_send_jobs;
create policy newsletter_send_jobs_staff on public.newsletter_send_jobs
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists newsletter_provider_events_staff on public.newsletter_provider_events;
create policy newsletter_provider_events_staff on public.newsletter_provider_events
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));
