-- Categories (taxonomies) + Series + Newsletter lists / subscriptions / interests.
-- Topics on the public site = category taxonomies.
-- Interests (topic tastes) are NOT email subscriptions.

-- ── Category fields on taxonomies ───────────────────────────────────────────
alter table public.taxonomies
  add column if not exists description text not null default '';

alter table public.taxonomies
  add column if not exists image_url text;

alter table public.taxonomies
  add column if not exists sort_order integer not null default 0;

create index if not exists taxonomies_kind_sort_idx
  on public.taxonomies (kind, sort_order, name);

-- Primary category among a post's category links
alter table public.content_taxonomies
  add column if not exists is_primary boolean not null default false;

create unique index if not exists content_taxonomies_one_primary_idx
  on public.content_taxonomies (content_id)
  where is_primary;

-- ── Series (recurring publications) ─────────────────────────────────────────
create table if not exists public.series (
  id          uuid primary key default gen_random_uuid(),
  slug        citext not null,
  name        text not null,
  description text not null default '',
  image_url   text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint series_slug_uidx unique (slug)
);

create table if not exists public.content_series (
  content_id   uuid not null references public.contents (id) on delete cascade,
  series_id    uuid not null references public.series (id) on delete cascade,
  issue_number integer,
  created_at   timestamptz not null default now(),
  primary key (content_id),
  constraint content_series_issue_uidx unique (series_id, issue_number)
);

create index if not exists content_series_series_idx
  on public.content_series (series_id, issue_number);

-- ── Newsletter publications (email preferences) ─────────────────────────────
create table if not exists public.newsletter_lists (
  id          uuid primary key default gen_random_uuid(),
  slug        citext not null,
  name        text not null,
  description text not null default '',
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint newsletter_lists_slug_uidx unique (slug)
);

create table if not exists public.contact_subscriptions (
  contact_id      uuid not null references public.contacts (id) on delete cascade,
  list_id         uuid not null references public.newsletter_lists (id) on delete cascade,
  status          text not null default 'subscribed'
                    check (status in ('subscribed', 'unsubscribed', 'pending')),
  subscribed_at   timestamptz,
  unsubscribed_at timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (contact_id, list_id)
);

create index if not exists contact_subscriptions_list_status_idx
  on public.contact_subscriptions (list_id, status);

-- Topic interests for personalization (never auto-subscribe)
create table if not exists public.contact_interests (
  contact_id  uuid not null references public.contacts (id) on delete cascade,
  taxonomy_id uuid not null references public.taxonomies (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (contact_id, taxonomy_id)
);

create index if not exists contact_interests_taxonomy_idx
  on public.contact_interests (taxonomy_id);

alter table public.newsletter_issues
  add column if not exists list_id uuid references public.newsletter_lists (id) on delete set null;

create index if not exists newsletter_issues_list_idx
  on public.newsletter_issues (list_id)
  where list_id is not null;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.series enable row level security;
alter table public.content_series enable row level security;
alter table public.newsletter_lists enable row level security;
alter table public.contact_subscriptions enable row level security;
alter table public.contact_interests enable row level security;

drop policy if exists series_public_read on public.series;
create policy series_public_read on public.series
  for select to anon, authenticated
  using (true);

drop policy if exists series_staff on public.series;
create policy series_staff on public.series
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists content_series_staff on public.content_series;
create policy content_series_staff on public.content_series
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists newsletter_lists_staff on public.newsletter_lists;
create policy newsletter_lists_staff on public.newsletter_lists
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

-- Active list names are readable so preference UIs can render without service role.
drop policy if exists newsletter_lists_public_read on public.newsletter_lists;
create policy newsletter_lists_public_read on public.newsletter_lists
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists contact_subscriptions_staff on public.contact_subscriptions;
create policy contact_subscriptions_staff on public.contact_subscriptions
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists contact_interests_staff on public.contact_interests;
create policy contact_interests_staff on public.contact_interests
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

-- ── Seeds ───────────────────────────────────────────────────────────────────
insert into public.taxonomies (kind, slug, name, description, sort_order)
values
  ('category', 'ai', 'AI', 'Articles about artificial intelligence.', 10),
  ('category', 'vibe-coding', 'Vibe Coding', 'Building with AI-assisted coding workflows.', 20),
  ('category', 'prompts', 'Prompts', 'Prompt craft, libraries, and patterns.', 30),
  ('category', 'ai-agents', 'AI Agents', 'Autonomous and agentic AI systems.', 40),
  ('category', 'platforms', 'Platforms', 'Platform reviews, comparisons, and tutorials.', 50),
  ('category', 'hardware', 'Hardware', 'Devices, chips, and physical tech.', 60),
  ('category', 'software', 'Software', 'Apps, OS, and software tooling.', 70),
  ('category', 'gadgets', 'Gadgets', 'Consumer gadgets and gear.', 80),
  ('category', 'tech', 'Tech', 'General technology coverage.', 90),
  ('category', 'saas', 'SaaS', 'Software-as-a-service products and stacks.', 100)
on conflict (kind, slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.series (slug, name, description, sort_order)
values
  (
    'this-week-in-tech',
    'This Week in Tech',
    'Weekly roundup across topics. Editions may cover AI, crypto, platforms, and more in one issue.',
    10
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.newsletter_lists (slug, name, description, sort_order)
values
  (
    'this-week-in-tech',
    'This Week in Tech',
    'Weekly roundup across topics.',
    10
  ),
  (
    'ai-updates',
    'AI Updates',
    'Dedicated AI articles and resources.',
    20
  ),
  (
    'crypto-updates',
    'Crypto Updates',
    'Dedicated crypto coverage.',
    30
  ),
  (
    'tools-platforms',
    'Tools & Platforms',
    'Reviews, comparisons, and tutorials.',
    40
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
