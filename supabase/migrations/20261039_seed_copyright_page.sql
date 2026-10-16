-- Inventory row so Copyright appears in Admin → Pages.
-- Public rendering stays on the React route `/copyright` (Legal.tsx).

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
    'b1000001-0001-4000-8000-000000000007',
    'page',
    'Copyright',
    'copyright',
    'published',
    'Public copyright and notice page. Copy lives in code until a studio editor lands.',
    '{"managed_surface":"copyright","adminEditPath":"/admin/public-site"}'::jsonb,
    '{"format":"blocks","blocks":[]}'::jsonb,
    '{"format":"blocks","blocks":[]}'::jsonb,
    '',
    '[]'::jsonb,
    '{}'::jsonb,
    'article',
    now(),
    'Copyright · I Call BS',
    'Who owns the writing and files on this site, and how to send a notice.'
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
