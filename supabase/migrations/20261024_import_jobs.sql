-- Phase 8d: Import/migration jobs (kit subscribers → contacts).
-- Dry-run + commit via service-role API. Never mutates kit subscribers.

create table if not exists public.import_jobs (
  id            uuid primary key default gen_random_uuid(),
  source        text not null default 'kit_subscribers',
  status        text not null default 'draft',
  mapping       jsonb not null default '{}'::jsonb,
  summary       jsonb not null default '{}'::jsonb,
  error_message text,
  created_by    uuid references public.profiles (id) on delete set null,
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint import_jobs_source_check check (source in ('kit_subscribers')),
  constraint import_jobs_status_check
    check (status in ('draft', 'dry_run', 'committing', 'committed', 'failed'))
);

create index if not exists import_jobs_created_idx
  on public.import_jobs (created_at desc);

create table if not exists public.import_job_rows (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.import_jobs (id) on delete cascade,
  source_key   text not null,
  email        citext,
  action       text not null,
  reason       text not null default '',
  status       text not null default 'planned',
  plan         jsonb not null default '{}'::jsonb,
  contact_id   uuid references public.contacts (id) on delete set null,
  error_message text,
  applied_at   timestamptz,
  created_at   timestamptz not null default now(),
  constraint import_job_rows_job_source_uidx unique (job_id, source_key),
  constraint import_job_rows_action_check
    check (action in ('create', 'update', 'skip', 'suppress')),
  constraint import_job_rows_status_check
    check (status in ('planned', 'applied', 'skipped', 'failed'))
);

create index if not exists import_job_rows_job_idx
  on public.import_job_rows (job_id, action);

-- Global idempotency across jobs for the same source key.
create table if not exists public.import_applied_keys (
  source         text not null,
  source_key     text not null,
  contact_id     uuid references public.contacts (id) on delete set null,
  applied_job_id uuid references public.import_jobs (id) on delete set null,
  applied_at     timestamptz not null default now(),
  primary key (source, source_key),
  constraint import_applied_keys_source_check check (source in ('kit_subscribers'))
);

alter table public.import_jobs enable row level security;
alter table public.import_job_rows enable row level security;
alter table public.import_applied_keys enable row level security;

drop policy if exists import_jobs_staff on public.import_jobs;
create policy import_jobs_staff on public.import_jobs
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists import_job_rows_staff on public.import_job_rows;
create policy import_job_rows_staff on public.import_job_rows
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists import_applied_keys_staff on public.import_applied_keys;
create policy import_applied_keys_staff on public.import_applied_keys
  for select to authenticated
  using (public.has_staff_capability('content.update_any'));
