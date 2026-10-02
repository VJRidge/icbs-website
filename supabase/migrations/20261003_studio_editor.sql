-- Studio block editor (Clubhouse port): working-copy columns on contents + short links.
-- Autosave writes body/content_blocks only; published_document is the live snapshot.

alter table public.contents
  add column if not exists body text not null default '',
  add column if not exists content_blocks jsonb not null default '[]'::jsonb,
  add column if not exists featured_image_url text,
  add column if not exists featured_image_alt text,
  add column if not exists seo_title text,
  add column if not exists seo_description text;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists contents_touch_updated_at on public.contents;
create trigger contents_touch_updated_at
  before update on public.contents
  for each row execute function public.touch_updated_at();

create table if not exists public.cms_short_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]{4,16}$'),
  resource_type text not null check (resource_type in ('site_page', 'blog_post')),
  resource_id uuid not null references public.contents (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (resource_type, resource_id)
);

alter table public.cms_short_links enable row level security;

drop policy if exists cms_short_links_staff_all on public.cms_short_links;
create policy cms_short_links_staff_all on public.cms_short_links
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Public resolver: returns a site path only for published content.
create or replace function public.resolve_cms_short_link(p_code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case c.kind::text when 'post' then '/blog/' || c.slug::text else '/' || c.slug::text end
  from public.cms_short_links l
  join public.contents c on c.id = l.resource_id
  where l.code = lower(trim(p_code))
    and c.status = 'published'
    and c.published_document is not null
  limit 1;
$$;

revoke all on function public.resolve_cms_short_link(text) from public;
grant execute on function public.resolve_cms_short_link(text) to anon, authenticated;
