-- Audience: contact tags + saved segments; newsletter issues can target a segment.
-- Null newsletter_issues.segment_id keeps legacy behavior (all marketing_ok, not suppressed).

create table if not exists public.contact_tags (
  id         uuid primary key default gen_random_uuid(),
  slug       citext not null,
  label      text not null,
  created_at timestamptz not null default now(),
  constraint contact_tags_slug_uidx unique (slug)
);

create table if not exists public.contact_tag_links (
  contact_id uuid not null references public.contacts (id) on delete cascade,
  tag_id     uuid not null references public.contact_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create index if not exists contact_tag_links_tag_idx
  on public.contact_tag_links (tag_id);

create table if not exists public.audience_segments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  definition  jsonb not null default '{"match":"all","rules":[]}'::jsonb,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists audience_segments_updated_idx
  on public.audience_segments (updated_at desc);

alter table public.newsletter_issues
  add column if not exists segment_id uuid references public.audience_segments (id) on delete set null;

create index if not exists newsletter_issues_segment_idx
  on public.newsletter_issues (segment_id)
  where segment_id is not null;

-- Optional source tag for imports / attribution (free-text slug list also via links).
alter table public.contacts
  add column if not exists source_label text;

alter table public.contact_tags enable row level security;
alter table public.contact_tag_links enable row level security;
alter table public.audience_segments enable row level security;

drop policy if exists contact_tags_staff on public.contact_tags;
create policy contact_tags_staff on public.contact_tags
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists contact_tag_links_staff on public.contact_tag_links;
create policy contact_tag_links_staff on public.contact_tag_links
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists audience_segments_staff on public.audience_segments;
create policy audience_segments_staff on public.audience_segments
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

-- Seed common tags (idempotent).
insert into public.contact_tags (slug, label)
values
  ('newsletter', 'Newsletter'),
  ('kit', 'Free kit'),
  ('builder-starter', 'Builder Starter Kit'),
  ('buyer', 'Book buyer')
on conflict (slug) do nothing;
