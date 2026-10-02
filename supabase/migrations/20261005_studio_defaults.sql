-- Starter templates from existing published pages, plus kit slot + SEO defaults.
-- Safe to re-run: skips titles that already exist and only fills empty settings.

insert into public.templates (title, kind, is_global, document)
select v.title, v.kind, false,
  jsonb_build_object(
    'format', 'blocks',
    'blocks', coalesce(c.content_blocks, '[]'::jsonb),
    'layout', coalesce(c.layout, 'article')
  )
from (
  select id, 'Landing — About'::text as title, 'page'::text as kind
  from public.contents
  where kind = 'page' and slug = 'about' and status = 'published'
  union all
  select id, 'Landing — Free starter kit', 'page'
  from public.contents
  where kind = 'page' and slug = 'kit-v2' and status = 'published'
  union all
  select id, 'Article — blog post', 'post'
  from public.contents
  where kind = 'post' and status = 'published'
  order by 2
  limit 3
) v
join public.contents c on c.id = v.id
where not exists (select 1 from public.templates t where t.title = v.title);

update public.settings
set
  kit_content_id = coalesce(
    kit_content_id,
    (select id from public.contents where kind = 'page' and slug = 'kit-v2' and status = 'published' limit 1)
  ),
  site_description = coalesce(
    nullif(trim(site_description), ''),
    'The honest version of build an app with AI. No fairy tales. No thirty-minute miracles.'
  ),
  global_styles = coalesce(global_styles, '{}'::jsonb)
    || jsonb_build_object('seoTitleSuffix', coalesce(global_styles->>'seoTitleSuffix', 'I Call BS'))
where id = 1;
