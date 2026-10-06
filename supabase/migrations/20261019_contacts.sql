-- Phase 7b: Contacts identity + consent events (separate from kit subscribers).
-- Staff read/write via has_staff_capability('content.update_any').
-- Public writes only through service-role APIs.

create table if not exists public.contacts (
  id                 uuid primary key default gen_random_uuid(),
  email              citext not null,
  first_name         text,
  marketing_ok       boolean not null default false,
  suppressed_at      timestamptz,
  unsubscribe_token  uuid not null default gen_random_uuid(),
  source_form_id     uuid references public.forms (id) on delete set null,
  first_consented_at timestamptz,
  last_consented_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint contacts_email_uidx unique (email)
);

create unique index if not exists contacts_unsubscribe_token_uidx
  on public.contacts (unsubscribe_token);

create index if not exists contacts_marketing_ok_idx
  on public.contacts (marketing_ok)
  where marketing_ok = true;

create table if not exists public.contact_consent_events (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid not null references public.contacts (id) on delete cascade,
  event_type      text not null,
  consent_text    text not null default '',
  form_id         uuid references public.forms (id) on delete set null,
  form_version    int,
  submission_id   uuid references public.form_submissions (id) on delete set null,
  occurred_at     timestamptz not null default now(),
  meta            jsonb not null default '{}'::jsonb,
  constraint contact_consent_events_type_check
    check (event_type in ('granted', 'revoked', 'suppressed'))
);

create index if not exists contact_consent_events_contact_idx
  on public.contact_consent_events (contact_id, occurred_at desc);

alter table public.contacts enable row level security;
alter table public.contact_consent_events enable row level security;

drop policy if exists contacts_staff on public.contacts;
create policy contacts_staff on public.contacts
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists contact_consent_events_staff on public.contact_consent_events;
create policy contact_consent_events_staff on public.contact_consent_events
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));
