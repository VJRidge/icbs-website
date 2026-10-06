-- Phase 7c: Lead magnets + durable delivery outbox (separate from kit subscribers).

create table if not exists public.lead_magnets (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null default 'Untitled lead magnet',
  slug               citext not null,
  status             text not null default 'draft',
  active_version_id  uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint lead_magnets_slug_uidx unique (slug),
  constraint lead_magnets_status_check check (status in ('draft', 'published'))
);

create table if not exists public.lead_magnet_versions (
  id              uuid primary key default gen_random_uuid(),
  lead_magnet_id  uuid not null references public.lead_magnets (id) on delete cascade,
  version         int not null default 1,
  media_id        uuid not null references public.media (id) on delete restrict,
  label           text not null default '',
  created_at      timestamptz not null default now(),
  constraint lead_magnet_versions_uidx unique (lead_magnet_id, version)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lead_magnets_active_version_fk'
  ) then
    alter table public.lead_magnets
      add constraint lead_magnets_active_version_fk
      foreign key (active_version_id)
      references public.lead_magnet_versions (id)
      on delete set null;
  end if;
end $$;

create table if not exists public.delivery_jobs (
  id                      uuid primary key default gen_random_uuid(),
  idempotency_key         text not null,
  contact_id              uuid not null references public.contacts (id) on delete cascade,
  lead_magnet_id          uuid not null references public.lead_magnets (id) on delete cascade,
  lead_magnet_version_id  uuid not null references public.lead_magnet_versions (id) on delete restrict,
  form_id                 uuid references public.forms (id) on delete set null,
  submission_id           uuid references public.form_submissions (id) on delete set null,
  status                  text not null default 'pending',
  attempts                int not null default 0,
  max_attempts            int not null default 5,
  next_attempt_at         timestamptz not null default now(),
  last_error              text,
  sent_at                 timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint delivery_jobs_idempotency_uidx unique (idempotency_key),
  constraint delivery_jobs_status_check
    check (status in ('pending', 'processing', 'sent', 'failed', 'skipped'))
);

create index if not exists delivery_jobs_claim_idx
  on public.delivery_jobs (status, next_attempt_at)
  where status in ('pending', 'processing');

alter table public.lead_magnets enable row level security;
alter table public.lead_magnet_versions enable row level security;
alter table public.delivery_jobs enable row level security;

drop policy if exists lead_magnets_staff on public.lead_magnets;
create policy lead_magnets_staff on public.lead_magnets
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists lead_magnet_versions_staff on public.lead_magnet_versions;
create policy lead_magnet_versions_staff on public.lead_magnet_versions
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists delivery_jobs_staff on public.delivery_jobs;
create policy delivery_jobs_staff on public.delivery_jobs
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));
