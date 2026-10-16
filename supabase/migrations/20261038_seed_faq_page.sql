-- Inventory row so FAQ appears in Admin → Pages and the dashboard Public resources cards.
-- Public rendering stays on the React route `/faq` (FaqPage).

insert into public.contents (
  id,
  kind,
  title,
  slug,
  status,
  excerpt,
  seo,
  draft_document,
  published_document,
  body,
  content_blocks,
  structured_fields,
  layout,
  published_at,
  seo_title,
  seo_description
)
values
  (
    'b1000001-0001-4000-8000-000000000006',
    'page',
    'FAQ',
    'faq',
    'published',
    'Public accordion at /faq. Questions live in code until a studio editor lands.',
    '{"managed_surface":"faq","adminEditPath":"/admin/public-site"}'::jsonb,
    '{"format":"blocks","blocks":[]}'::jsonb,
    '{"format":"blocks","blocks":[]}'::jsonb,
    '',
    '[]'::jsonb,
    '{}'::jsonb,
    'article',
    now(),
    'FAQ · I Call BS',
    'Straight answers about the free kit, the complete book, downloads, and email.'
  )
on conflict (kind, slug) do update
set
  title = excluded.title,
  status = 'published',
  excerpt = excluded.excerpt,
  seo = excluded.seo,
  structured_fields = '{}'::jsonb,
  published_document = excluded.published_document,
  published_at = coalesce(public.contents.published_at, excluded.published_at),
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  updated_at = now();
