-- Live topic archives: join published contents to content_taxonomies (not stale publish meta).

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
  order by pc.published_at desc
  limit 500;
$$;

revoke all on function public.published_posts_for_topic(citext) from public;
grant execute on function public.published_posts_for_topic(citext) to anon, authenticated;
