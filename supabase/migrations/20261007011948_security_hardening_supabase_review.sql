-- Security hardening from docs/reviews/03-security-supabase-review.md
-- SUP-001/002/003/009: stop auto-approve, revoke definer RPCs, tighten purchases,
-- published_contents as security_invoker + published SELECT on contents.

-- ---------------------------------------------------------------------------
-- SUP-001 — New Auth users are pending until an owner approves
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, staff_approved, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    false,
    'author'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);
  -- Do not flip staff_approved on conflict (owner may have set it).
  return new;
end;
$$;

-- Trigger-only: not callable via PostgREST RPC
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- SUP-002 — Revoke anon EXECUTE on staff probe helpers (keep authenticated)
-- ---------------------------------------------------------------------------
revoke all on function public.is_staff() from public;
revoke all on function public.is_staff() from anon;
grant execute on function public.is_staff() to authenticated;

revoke all on function public.is_owner() from public;
revoke all on function public.is_owner() from anon;
grant execute on function public.is_owner() to authenticated;

revoke all on function public.has_staff_capability(text) from public;
revoke all on function public.has_staff_capability(text) from anon;
grant execute on function public.has_staff_capability(text) to authenticated;

revoke all on function public.next_newsletter_issue_number(uuid) from public;
revoke all on function public.next_newsletter_issue_number(uuid) from anon;
grant execute on function public.next_newsletter_issue_number(uuid) to authenticated;

-- Intentional public RPCs (short links + topic archive) stay granted to anon.

-- ---------------------------------------------------------------------------
-- SUP-001 — Purchases: sales/PII read requires content.update_any (not author)
-- ---------------------------------------------------------------------------
drop policy if exists purchases_staff on public.purchases;
create policy purchases_staff on public.purchases
  for select to authenticated
  using (public.has_staff_capability('content.update_any'));

-- ---------------------------------------------------------------------------
-- SUP-003 — published_contents: security_invoker + RLS path for anon
-- ---------------------------------------------------------------------------
-- Narrow public path: anon + published snapshot columns only (see follow-up
-- 20261007013012 for column grants if this migration already applied broadly).
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

revoke all on table public.contents from anon;
grant select (id, status, published_document) on table public.contents to anon;
grant select on table public.contents to authenticated;

create or replace view public.published_contents
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
  c.published_document->'_meta'->>'public_path' as public_path
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

-- ---------------------------------------------------------------------------
-- SUP-009 — Service-role-only tables: explicit revoke from Data API roles
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.subscribers') is not null then
    revoke all on table public.subscribers from anon, authenticated;
  end if;
  if to_regclass('public.rate_limit_buckets') is not null then
    revoke all on table public.rate_limit_buckets from anon, authenticated;
  end if;
  if to_regclass('public.content_previews') is not null then
    revoke all on table public.content_previews from anon, authenticated;
  end if;
end $$;
