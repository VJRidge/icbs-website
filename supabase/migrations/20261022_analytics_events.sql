-- Phase 8b: First-party conversion events + metric definitions.
-- No fabricated dashboard data — studio aggregates only from stored rows.

create table if not exists public.metric_definitions (
  key          text primary key,
  label        text not null,
  description  text not null default '',
  event_name   text not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.conversion_events (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  occurred_at     timestamptz not null default now(),
  session_id      text,
  path            text,
  referrer        text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_content     text,
  content_id      uuid references public.contents (id) on delete set null,
  form_id         uuid references public.forms (id) on delete set null,
  contact_id      uuid references public.contacts (id) on delete set null,
  submission_id   uuid references public.form_submissions (id) on delete set null,
  meta            jsonb not null default '{}'::jsonb,
  ip_hash         text,
  user_agent      text,
  bot_suspect     boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists conversion_events_name_time_idx
  on public.conversion_events (name, occurred_at desc);

create index if not exists conversion_events_path_time_idx
  on public.conversion_events (path, occurred_at desc);

alter table public.metric_definitions enable row level security;
alter table public.conversion_events enable row level security;

drop policy if exists metric_definitions_staff on public.metric_definitions;
create policy metric_definitions_staff on public.metric_definitions
  for all to authenticated
  using (public.has_staff_capability('content.read'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists conversion_events_staff_read on public.conversion_events;
create policy conversion_events_staff_read on public.conversion_events
  for select to authenticated
  using (public.has_staff_capability('content.read'));

-- Inserts are service-role only (no authenticated insert policy).

insert into public.metric_definitions (key, label, description, event_name)
values
  ('page_views', 'Page views', 'Public page view beacons', 'page_view'),
  ('form_starts', 'Form starts', 'Lead-capture form rendered / focused', 'form_start'),
  ('form_submits', 'Form submits', 'Successful lead-capture submissions', 'form_submit'),
  ('contacts_created', 'Contacts created', 'Marketing contact upserts with consent', 'contact_created'),
  ('kit_subscribes', 'Kit signups', 'Kit funnel subscribe successes (separate list)', 'kit_subscribe')
on conflict (key) do nothing;
