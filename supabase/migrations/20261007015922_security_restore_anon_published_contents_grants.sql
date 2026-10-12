-- Restore anon SELECT for public published reads.
-- Prior hardening REVOKE ALL'd anon from contents, which broke production CMS
-- (and security_invoker published_contents). Keep draft working columns ungated.

revoke all on table public.contents from anon;

-- Snapshot / public metadata columns only — not draft working fields.
grant select (
  id,
  kind,
  parent_id,
  title,
  slug,
  status,
  author_id,
  featured_media_id,
  excerpt,
  seo,
  published_document,
  doc_version,
  published_at,
  scheduled_for,
  created_at,
  updated_at,
  featured_image_url,
  featured_image_alt,
  seo_title,
  seo_description,
  layout,
  content_type_id,
  structured_schema_version,
  structured_fields
) on table public.contents to anon;

-- Explicit deny of working/draft columns (idempotent if never granted).
revoke select (draft_document, body, content_blocks) on table public.contents from anon;

-- Keep published-only RLS for anon (created in prior hardening migrations).
drop policy if exists contents_public_published_select on public.contents;
create policy contents_public_published_select on public.contents
  for select to anon
  using (
    status = 'published'
    and published_document is not null
    and (
      published_document->'_meta'->>'published_at' is null
      or (published_document->'_meta'->>'published_at')::timestamptz <= now()
    )
  );

grant select on public.published_contents to anon, authenticated;
