-- Phase 8c: Campaign blueprints (link existing records; no auto-send, no Stripe).

create table if not exists public.campaigns (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null default 'Untitled campaign',
  slug               citext not null,
  status             text not null default 'draft',
  notes              text not null default '',
  eligibility_snapshot jsonb not null default '{}'::jsonb,
  ready_at           timestamptz,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint campaigns_slug_uidx unique (slug),
  constraint campaigns_status_check check (status in ('draft', 'ready', 'archived'))
);

create table if not exists public.campaign_steps (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns (id) on delete cascade,
  sort_order   int not null default 0,
  step_type    text not null,
  ref_id       uuid,
  label        text not null default '',
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  constraint campaign_steps_type_check
    check (step_type in ('page', 'form', 'lead_magnet', 'newsletter_issue', 'note'))
);

create index if not exists campaign_steps_campaign_idx
  on public.campaign_steps (campaign_id, sort_order);

alter table public.campaigns enable row level security;
alter table public.campaign_steps enable row level security;

drop policy if exists campaigns_staff on public.campaigns;
create policy campaigns_staff on public.campaigns
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists campaign_steps_staff on public.campaign_steps;
create policy campaign_steps_staff on public.campaign_steps
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));
