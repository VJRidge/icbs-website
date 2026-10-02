-- CMS core: profiles, contents, media, settings, menus, forms, redirects, activity.
-- Does not alter public.subscribers (funnel table stays service-role only).
-- After running: Authentication → Add user, then:
--   update public.profiles
--     set role = 'owner', staff_approved = true
--     where id = '<auth user uuid>';

create extension if not exists citext;

do $$ begin
  create type public.staff_role as enum ('owner', 'admin', 'editor', 'author');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.content_kind as enum ('page', 'post');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.content_status as enum ('draft', 'published', 'scheduled', 'trash');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role            public.staff_role not null default 'author',
  staff_approved  boolean not null default false,
  display_name    text,
  disabled_at     timestamptz,
  created_at    timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.disabled_at is null
      and p.staff_approved = true
      and p.role in ('owner', 'admin', 'editor', 'author')
  );
$$;

create table if not exists public.media (
  id              uuid primary key default gen_random_uuid(),
  bucket          text not null,
  path            text not null,
  mime            text,
  byte_size       bigint,
  width           int,
  height          int,
  duration_ms     int,
  title           text,
  alt             text,
  caption         text,
  credit          text,
  tags            text[] not null default '{}',
  folder          text,
  is_public       boolean not null default true,
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  unique (bucket, path)
);

create table if not exists public.contents (
  id                    uuid primary key default gen_random_uuid(),
  kind                  public.content_kind not null default 'page',
  parent_id             uuid references public.contents (id) on delete set null,
  title                 text not null default 'Untitled',
  slug                  citext not null,
  status                public.content_status not null default 'draft',
  author_id             uuid references public.profiles (id),
  featured_media_id     uuid references public.media (id) on delete set null,
  excerpt               text,
  seo                   jsonb not null default '{}',
  draft_document        jsonb not null default '{"schemaVersion":1,"title":"","nodes":[]}',
  published_document    jsonb,
  doc_version           int not null default 1,
  published_at          timestamptz,
  scheduled_for         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (kind, slug)
);

create index if not exists contents_status_idx on public.contents (kind, status);
create index if not exists contents_parent_idx on public.contents (parent_id);

create table if not exists public.content_revisions (
  id            uuid primary key default gen_random_uuid(),
  content_id    uuid not null references public.contents (id) on delete cascade,
  document      jsonb not null,
  title         text,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);

create table if not exists public.media_usages (
  media_id      uuid not null references public.media (id) on delete cascade,
  content_id    uuid not null references public.contents (id) on delete cascade,
  primary key (media_id, content_id)
);

create table if not exists public.taxonomies (
  id        uuid primary key default gen_random_uuid(),
  kind      text not null check (kind in ('category', 'tag')),
  slug      citext not null,
  name      text not null,
  unique (kind, slug)
);

create table if not exists public.content_taxonomies (
  content_id    uuid not null references public.contents (id) on delete cascade,
  taxonomy_id   uuid not null references public.taxonomies (id) on delete cascade,
  primary key (content_id, taxonomy_id)
);

create table if not exists public.menus (
  id          uuid primary key default gen_random_uuid(),
  location    text not null unique,
  title       text not null,
  items       jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

create table if not exists public.templates (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  kind          text not null,
  is_global     boolean not null default false,
  document      jsonb not null default '{"schemaVersion":1,"title":"","nodes":[]}',
  created_at    timestamptz not null default now()
);

create table if not exists public.redirects (
  id          uuid primary key default gen_random_uuid(),
  from_path   text not null unique,
  to_path     text not null,
  status_code int not null default 301,
  created_at  timestamptz not null default now()
);

create table if not exists public.forms (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  fields      jsonb not null default '[]',
  settings    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists public.form_submissions (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references public.forms (id) on delete cascade,
  payload       jsonb not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.settings (
  id                  int primary key default 1 check (id = 1),
  site_name           text not null default 'I Call BS',
  site_description    text,
  homepage_content_id uuid references public.contents (id) on delete set null,
  blog_content_id     uuid references public.contents (id) on delete set null,
  timezone            text not null default 'America/New_York',
  date_format         text not null default 'MMMM d, yyyy',
  logo_media_id       uuid references public.media (id) on delete set null,
  favicon_media_id    uuid references public.media (id) on delete set null,
  global_styles       jsonb not null default '{}',
  updated_at          timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id),
  action      text not null,
  entity      text,
  entity_id   uuid,
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.media enable row level security;
alter table public.contents enable row level security;
alter table public.content_revisions enable row level security;
alter table public.media_usages enable row level security;
alter table public.taxonomies enable row level security;
alter table public.content_taxonomies enable row level security;
alter table public.menus enable row level security;
alter table public.templates enable row level security;
alter table public.redirects enable row level security;
alter table public.forms enable row level security;
alter table public.form_submissions enable row level security;
alter table public.settings enable row level security;
alter table public.activity_log enable row level security;

-- Profiles: staff can read all staff; users can read self
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_staff_update on public.profiles;
create policy profiles_staff_update on public.profiles
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Published contents readable by anyone
drop policy if exists contents_public_read on public.contents;
create policy contents_public_read on public.contents
  for select to anon, authenticated
  using (status = 'published' and published_document is not null);

drop policy if exists contents_staff_all on public.contents;
create policy contents_staff_all on public.contents
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists revisions_staff on public.content_revisions;
create policy revisions_staff on public.content_revisions
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists media_public_read on public.media;
create policy media_public_read on public.media
  for select to anon, authenticated
  using (is_public = true);

drop policy if exists media_staff_all on public.media;
create policy media_staff_all on public.media
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists media_usages_staff on public.media_usages;
create policy media_usages_staff on public.media_usages
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists taxonomies_public_read on public.taxonomies;
create policy taxonomies_public_read on public.taxonomies
  for select to anon, authenticated
  using (true);

drop policy if exists taxonomies_staff on public.taxonomies;
create policy taxonomies_staff on public.taxonomies
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists content_taxonomies_public on public.content_taxonomies;
create policy content_taxonomies_public on public.content_taxonomies
  for select to anon, authenticated
  using (true);

drop policy if exists content_taxonomies_staff on public.content_taxonomies;
create policy content_taxonomies_staff on public.content_taxonomies
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists menus_public_read on public.menus;
create policy menus_public_read on public.menus
  for select to anon, authenticated
  using (true);

drop policy if exists menus_staff on public.menus;
create policy menus_staff on public.menus
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists templates_staff on public.templates;
create policy templates_staff on public.templates
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists redirects_public_read on public.redirects;
create policy redirects_public_read on public.redirects
  for select to anon, authenticated
  using (true);

drop policy if exists redirects_staff on public.redirects;
create policy redirects_staff on public.redirects
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists forms_staff on public.forms;
create policy forms_staff on public.forms
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists submissions_staff on public.form_submissions;
create policy submissions_staff on public.form_submissions
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings
  for select to anon, authenticated
  using (true);

drop policy if exists settings_staff_update on public.settings;
create policy settings_staff_update on public.settings
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists activity_staff on public.activity_log;
create policy activity_staff on public.activity_log
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('media-public', 'media-public', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('media-private', 'media-private', false)
on conflict (id) do nothing;

drop policy if exists media_public_select on storage.objects;
create policy media_public_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media-public');

drop policy if exists media_staff_public_write on storage.objects;
create policy media_staff_public_write on storage.objects
  for all to authenticated
  using (bucket_id in ('media-public', 'media-private') and public.is_staff())
  with check (bucket_id in ('media-public', 'media-private') and public.is_staff());
