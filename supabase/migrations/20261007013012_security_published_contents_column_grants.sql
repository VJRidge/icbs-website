-- Follow-up to security_hardening_supabase_review:
-- Public clients must not read working columns (draft_document, body, …) on contents.
-- Keep security_invoker on published_contents; narrow RLS + column grants for anon.

drop policy if exists contents_public_published_select on public.contents;

-- Anon only (authenticated staff already use capability policies).
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

-- Column privileges: anon may only touch snapshot fields the public view needs.
revoke all on table public.contents from anon;
grant select (id, status, published_document) on table public.contents to anon;

-- Authenticated keeps table-level select for staff RLS policies (capability-gated).
grant select on table public.contents to authenticated;
