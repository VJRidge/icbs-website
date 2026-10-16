-- Manual blog-grid order that does not change published_at.

alter table public.contents
  add column if not exists list_order integer not null default 0;

comment on column public.contents.list_order is
  'Public blog grid rank. Lower is first. Default 0 keeps newest-first by published_at.';

create index if not exists contents_post_list_order_idx
  on public.contents (kind, status, list_order, published_at desc);

grant select (list_order) on table public.contents to anon;

drop view if exists public.published_contents;
create view public.published_contents
with (security_invoker = true, security_barrier = true)
as
select
  c.id,
  (c.published_document->'_meta'->>'kind')::public.content_kind as kind,
  c.published_document->'_meta'->>'title' as title,
  (c.published_document->'_meta'->>'slug')::citext as slug,
  'published'::public.content_status as status,
  c.published_document->'_meta'->>'seo_title' as seo_title,
  c.published_document->'_meta'->>'seo_description' as seo_description,
  c.published_document->'_meta'->>'layout' as layout,
  (c.published_document->'_meta'->>'published_at')::timestamptz as published_at,
  c.published_document,
  (c.published_document->'_meta'->>'published_updated_at')::timestamptz as updated_at,
  coalesce(c.published_document->'_meta'->'taxonomies', '[]'::jsonb) as taxonomies,
  c.published_document->'_meta'->>'content_type_key' as content_type_key,
  c.published_document->'_meta'->>'public_path' as public_path,
  c.list_order
from public.contents c
where c.status = 'published'
  and c.published_document is not null
  and (
    c.published_document->'_meta'->>'published_at' is null
    or (c.published_document->'_meta'->>'published_at')::timestamptz <= now()
  );

grant select on public.published_contents to anon, authenticated;

comment on view public.published_contents is
  'Public published CMS rows. security_invoker so contents RLS applies to the caller.';

create or replace function public.published_posts_for_topic(p_slug citext)
returns table (
  slug text,
  title text,
  excerpt text,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pc.slug::text,
    coalesce(pc.published_document->>'title', pc.title)::text as title,
    coalesce(pc.published_document->>'excerpt', '')::text as excerpt,
    pc.published_at
  from public.published_contents pc
  join public.content_taxonomies ct on ct.content_id = pc.id
  join public.taxonomies t on t.id = ct.taxonomy_id
  where t.kind = 'category'
    and t.slug = p_slug
    and pc.kind = 'post'
    and pc.status = 'published'
    and pc.published_at is not null
    and pc.published_at <= now()
  order by pc.list_order asc, pc.published_at desc
  limit 500;
$$;

revoke all on function public.published_posts_for_topic(citext) from public;
grant execute on function public.published_posts_for_topic(citext) to anon, authenticated;
