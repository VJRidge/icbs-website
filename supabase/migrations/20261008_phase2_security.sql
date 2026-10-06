-- Phase 2: isolate public snapshots from working drafts and restrict staff administration.

-- Freeze all public metadata and taxonomy assignments inside the deliberate publish
-- snapshot. Autosave can then change the working row without changing public output.
create or replace function public.snapshot_content_public_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  public_taxonomies jsonb;
begin
  if new.published_document is null then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.published_document is not distinct from old.published_document then
      return new;
    end if;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('kind', t.kind, 'slug', t.slug, 'name', t.name)
      order by t.name
    ),
    '[]'::jsonb
  )
  into public_taxonomies
  from public.content_taxonomies ct
  join public.taxonomies t on t.id = ct.taxonomy_id
  where ct.content_id = new.id;

  new.published_document := new.published_document || jsonb_build_object(
    '_meta',
    jsonb_build_object(
      'kind', new.kind,
      'title', new.title,
      'slug', new.slug,
      'seo_title', new.seo_title,
      'seo_description', new.seo_description,
      'layout', new.layout,
      'published_at', new.published_at,
      'published_updated_at', now(),
      'taxonomies', public_taxonomies
    )
  );
  return new;
end;
$$;

drop trigger if exists zz_contents_snapshot_public_metadata on public.contents;
create trigger zz_contents_snapshot_public_metadata
  before insert or update of published_document on public.contents
  for each row execute function public.snapshot_content_public_metadata();

-- Backfill the snapshot envelope for existing published documents.
update public.contents
set published_document = published_document || '{"_meta":null}'::jsonb
where published_document is not null
  and not (published_document ? '_meta');

-- Public readers must never query the working `contents` row. Every mutable public
-- field below is read from the frozen metadata envelope.
create or replace view public.published_contents
with (security_barrier = true)
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
  coalesce(c.published_document->'_meta'->'taxonomies', '[]'::jsonb) as taxonomies
from public.contents c
where c.status = 'published'
  and c.published_document is not null
  and (
    c.published_document->'_meta'->>'published_at' is null
    or (c.published_document->'_meta'->>'published_at')::timestamptz <= now()
  );

revoke all on public.published_contents from public;
grant select on public.published_contents to anon, authenticated;

drop policy if exists contents_public_read on public.contents;
revoke select on public.contents from anon;

-- The projection already embeds taxonomy labels. Direct relationship reads can otherwise
-- reveal the identifiers and classification of draft records.
drop policy if exists content_taxonomies_public on public.content_taxonomies;
revoke select on public.content_taxonomies from anon;

-- Authenticated staff continue through RLS on the source table. Non-staff authenticated
-- visitors use the published projection, which exposes no working-copy columns.

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.staff_approved = true
      and p.role = 'owner'
      and p.disabled_at is null
  );
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

create or replace function public.has_staff_capability(capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case p.role
        when 'owner' then capability = any (array[
          'content.read', 'content.create', 'content.update_any',
          'content.publish', 'content.delete', 'users.manage'
        ])
        when 'admin' then capability = any (array[
          'content.read', 'content.create', 'content.update_any',
          'content.publish', 'content.delete'
        ])
        when 'editor' then capability = any (array[
          'content.read', 'content.create', 'content.update_any', 'content.publish'
        ])
        when 'author' then capability = any (array[
          'content.read', 'content.create', 'content.update_own'
        ])
        else false
      end
      from public.profiles p
      where p.id = auth.uid()
        and p.staff_approved = true
        and p.disabled_at is null
    ),
    false
  );
$$;

revoke all on function public.has_staff_capability(text) from public;
grant execute on function public.has_staff_capability(text) to authenticated;

drop policy if exists contents_staff_all on public.contents;
drop policy if exists contents_staff_read on public.contents;
drop policy if exists contents_staff_insert on public.contents;
drop policy if exists contents_staff_update on public.contents;
drop policy if exists contents_staff_delete on public.contents;

create policy contents_staff_read on public.contents
  for select to authenticated
  using (public.has_staff_capability('content.read'));

create policy contents_staff_insert on public.contents
  for insert to authenticated
  with check (
    public.has_staff_capability('content.create')
    and (
      public.has_staff_capability('content.update_any')
      or author_id = auth.uid()
    )
    and (
      public.has_staff_capability('content.publish')
      or status in ('draft', 'trash')
    )
  );

create policy contents_staff_update on public.contents
  for update to authenticated
  using (
    public.has_staff_capability('content.update_any')
    or (
      public.has_staff_capability('content.update_own')
      and author_id = auth.uid()
    )
  )
  with check (
    (
      public.has_staff_capability('content.update_any')
      or (
        public.has_staff_capability('content.update_own')
        and author_id = auth.uid()
      )
    )
    and (
      public.has_staff_capability('content.publish')
      or status in ('draft', 'trash')
    )
  );

create policy contents_staff_delete on public.contents
  for delete to authenticated
  using (public.has_staff_capability('content.delete'));

drop policy if exists profiles_staff_update on public.profiles;
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles
  for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());

comment on view public.published_contents is
  'Safe public read model. Working body, content_blocks, draft_document, author_id, and scheduling internals are intentionally excluded.';
