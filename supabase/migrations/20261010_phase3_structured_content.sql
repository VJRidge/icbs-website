-- Phase 3: schema-driven records reuse the established contents lifecycle.
-- All new columns are optional for page/post, and no existing row is rewritten.

create table if not exists public.content_types (
  id                       uuid primary key default gen_random_uuid(),
  key                      text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  singular_label           text not null,
  plural_label             text not null,
  description              text,
  route_prefix             text not null unique check (route_prefix ~ '^[a-z][a-z0-9-]*$'),
  schema_version           int not null default 1 check (schema_version > 0),
  editor_sections          jsonb not null default '[]'::jsonb check (jsonb_typeof(editor_sections) = 'array'),
  supports_builder         boolean not null default true,
  supports_taxonomies      boolean not null default true,
  supports_featured_media  boolean not null default true,
  publication_enabled      boolean not null default false,
  is_active                boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table if not exists public.content_type_fields (
  id               uuid primary key default gen_random_uuid(),
  content_type_id  uuid not null references public.content_types (id) on delete cascade,
  schema_version   int not null check (schema_version > 0),
  key              text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label            text not null,
  field_type       text not null check (
    field_type in ('text', 'rich_text', 'number', 'boolean', 'date', 'datetime', 'url', 'url_list', 'email', 'select', 'json')
  ),
  required_on_publish boolean not null default false,
  config            jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  section_key       text not null default 'details',
  position          int not null default 0 check (position >= 0),
  created_at        timestamptz not null default now(),
  unique (content_type_id, schema_version, key)
);

alter table public.contents
  add column if not exists content_type_id uuid references public.content_types (id),
  add column if not exists structured_schema_version int,
  add column if not exists structured_fields jsonb not null default '{}'::jsonb;

alter table public.contents
  drop constraint if exists contents_custom_shape_check;
alter table public.contents
  add constraint contents_custom_shape_check check (
    (
      kind = 'custom'
      and content_type_id is not null
      and structured_schema_version is not null
      and structured_schema_version > 0
      and jsonb_typeof(structured_fields) = 'object'
    )
    or
    (
      kind in ('page', 'post')
      and content_type_id is null
      and structured_schema_version is null
      and structured_fields = '{}'::jsonb
    )
  );

create index if not exists contents_custom_type_status_idx
  on public.contents (content_type_id, status, updated_at desc)
  where kind = 'custom';
create index if not exists contents_content_type_id_idx
  on public.contents (content_type_id)
  where content_type_id is not null;
create index if not exists content_type_fields_type_idx
  on public.content_type_fields (content_type_id, schema_version);

create table if not exists public.content_relationship_types (
  key                   text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  source_label          text not null,
  target_label          text not null,
  allowed_source_types  text[] not null,
  allowed_target_types  text[] not null,
  max_targets           int check (max_targets is null or max_targets > 0),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

create table if not exists public.content_relationships (
  id                 uuid primary key default gen_random_uuid(),
  source_content_id  uuid not null references public.contents (id) on delete cascade,
  target_content_id  uuid not null references public.contents (id) on delete restrict,
  relationship_type  text not null references public.content_relationship_types (key),
  position           int not null default 0 check (position >= 0),
  metadata           jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 16384
  ),
  created_by         uuid references public.profiles (id),
  created_at         timestamptz not null default now(),
  check (source_content_id <> target_content_id),
  unique (source_content_id, relationship_type, target_content_id)
);

create index if not exists content_relationships_source_idx
  on public.content_relationships (source_content_id);
create index if not exists content_relationships_target_idx
  on public.content_relationships (target_content_id);
create index if not exists content_relationships_created_by_idx
  on public.content_relationships (created_by);

create table if not exists public.content_media_links (
  content_id  uuid not null references public.contents (id) on delete cascade,
  media_id    uuid not null references public.media (id) on delete restrict,
  role        text not null check (role ~ '^[a-z][a-z0-9_]*$'),
  position    int not null default 0 check (position >= 0),
  metadata    jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at  timestamptz not null default now(),
  primary key (content_id, role, media_id)
);

create index if not exists content_media_links_media_idx
  on public.content_media_links (media_id);

create or replace function public.content_effective_type(content_row public.contents)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when content_row.kind = 'custom' then (
      select t.key from public.content_types t where t.id = content_row.content_type_id
    )
    else content_row.kind::text
  end;
$$;

create or replace function public.validate_structured_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  type_row public.content_types%rowtype;
  field_row public.content_type_fields%rowtype;
  field_value jsonb;
begin
  if new.kind <> 'custom' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if (
      old.status in ('published', 'scheduled')
      or new.status in ('published', 'scheduled')
    ) and old.status is distinct from new.status
       and not (select public.has_staff_capability('content.publish')) then
      raise exception 'Publishing state changes require content.publish'
        using errcode = '42501';
    end if;
    if old.published_document is distinct from new.published_document
       and not (select public.has_staff_capability('content.publish')) then
      raise exception 'Published snapshots require content.publish'
        using errcode = '42501';
    end if;
  elsif new.published_document is not null
        and not (select public.has_staff_capability('content.publish')) then
    raise exception 'Published snapshots require content.publish'
      using errcode = '42501';
  end if;

  select * into type_row
  from public.content_types
  where id = new.content_type_id and is_active;

  if not found or not exists (
    select 1 from public.content_type_fields f
    where f.content_type_id = new.content_type_id
      and f.schema_version = new.structured_schema_version
  ) then
    raise exception 'Unknown, inactive, or unsupported custom content schema'
      using errcode = '23514';
  end if;

  if new.status in ('published', 'scheduled')
     and type_row.schema_version <> new.structured_schema_version then
    raise exception 'Content must be migrated to the current schema before publication'
      using errcode = '23514';
  end if;

  if new.status in ('published', 'scheduled') and not type_row.publication_enabled then
    raise exception 'Publication is not enabled for this content type'
      using errcode = '23514';
  end if;

  if new.status = 'published' and new.published_document is null then
    raise exception 'Published custom content requires a published snapshot'
      using errcode = '23514';
  end if;
  if new.status = 'scheduled' and new.scheduled_for is null then
    raise exception 'Scheduled custom content requires a schedule'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(new.structured_fields) keys(key)
    where not exists (
      select 1
      from public.content_type_fields f
      where f.content_type_id = new.content_type_id
        and f.schema_version = new.structured_schema_version
        and f.key = keys.key
    )
  ) then
    raise exception 'Structured fields contain an unknown key'
      using errcode = '23514';
  end if;

  for field_row in
    select *
    from public.content_type_fields
    where content_type_id = new.content_type_id
      and schema_version = new.structured_schema_version
  loop
    field_value := new.structured_fields->field_row.key;

    if new.status in ('published', 'scheduled')
       and field_row.required_on_publish
       and (
         field_value is null
         or field_value = 'null'::jsonb
         or (jsonb_typeof(field_value) = 'string' and btrim(field_value #>> '{}') = '')
       ) then
      raise exception 'Required publication field "%" is missing', field_row.key
        using errcode = '23514';
    end if;

    if field_value is null or field_value = 'null'::jsonb then
      continue;
    end if;

    if field_row.field_type in ('text', 'rich_text', 'date', 'datetime', 'url', 'email', 'select')
       and jsonb_typeof(field_value) <> 'string' then
      raise exception 'Field "%" must be a string', field_row.key using errcode = '23514';
    elsif field_row.field_type = 'number' and jsonb_typeof(field_value) <> 'number' then
      raise exception 'Field "%" must be a number', field_row.key using errcode = '23514';
    elsif field_row.field_type = 'boolean' and jsonb_typeof(field_value) <> 'boolean' then
      raise exception 'Field "%" must be a boolean', field_row.key using errcode = '23514';
    elsif field_row.field_type = 'url_list' and (
      jsonb_typeof(field_value) <> 'array'
      or exists (
        select 1 from jsonb_array_elements(field_value) item
        where jsonb_typeof(item) <> 'string' or item #>> '{}' !~ '^https?://'
      )
    ) then
      raise exception 'Field "%" must contain HTTP(S) URLs', field_row.key using errcode = '23514';
    elsif field_row.field_type = 'url' and field_value #>> '{}' !~ '^https?://' then
      raise exception 'Field "%" must be an HTTP(S) URL', field_row.key using errcode = '23514';
    elsif field_row.field_type = 'email' and field_value #>> '{}' !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Field "%" must be an email address', field_row.key using errcode = '23514';
    elsif field_row.field_type = 'date' and field_value #>> '{}' !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Field "%" must be an ISO date', field_row.key using errcode = '23514';
    elsif field_row.field_type = 'datetime' and field_value #>> '{}' !~ '^\d{4}-\d{2}-\d{2}T' then
      raise exception 'Field "%" must be an ISO datetime', field_row.key using errcode = '23514';
    elsif field_row.field_type = 'select'
       and field_row.config ? 'options'
       and not (field_row.config->'options' ? (field_value #>> '{}')) then
      raise exception 'Field "%" contains an unsupported option', field_row.key using errcode = '23514';
    end if;

    begin
      if field_row.field_type = 'date' then
        perform (field_value #>> '{}')::date;
      elsif field_row.field_type = 'datetime' then
        perform (field_value #>> '{}')::timestamptz;
      end if;
    exception when invalid_datetime_format or datetime_field_overflow then
      raise exception 'Field "%" contains an invalid date or time', field_row.key using errcode = '23514';
    end;
  end loop;

  if type_row.key = 'event'
     and new.structured_fields ? 'starts_at'
     and new.structured_fields ? 'ends_at'
     and (new.structured_fields->>'ends_at')::timestamptz <= (new.structured_fields->>'starts_at')::timestamptz then
    raise exception 'Event end must be after its start' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists contents_validate_structured on public.contents;
create trigger contents_validate_structured
  before insert or update on public.contents
  for each row execute function public.validate_structured_content();

create or replace function public.validate_content_relationship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_row public.contents%rowtype;
  target_row public.contents%rowtype;
  definition public.content_relationship_types%rowtype;
  source_type text;
  target_type text;
begin
  if tg_op = 'UPDATE'
     and (
       old.source_content_id is distinct from new.source_content_id
       or old.target_content_id is distinct from new.target_content_id
       or old.relationship_type is distinct from new.relationship_type
     )
     and not (select public.has_staff_capability('content.delete')) then
    raise exception 'Changing relationship identity requires content.delete'
      using errcode = '42501';
  end if;

  select * into source_row from public.contents where id = new.source_content_id;
  if not found then
    raise exception 'Relationship source does not exist' using errcode = '23503';
  end if;
  select * into target_row from public.contents where id = new.target_content_id;
  if not found then
    raise exception 'Relationship target does not exist' using errcode = '23503';
  end if;
  select * into definition from public.content_relationship_types
    where key = new.relationship_type and is_active;
  if not found then
    raise exception 'Unknown or inactive relationship type' using errcode = '23514';
  end if;

  source_type := public.content_effective_type(source_row);
  target_type := public.content_effective_type(target_row);
  if not source_type = any(definition.allowed_source_types)
     or not target_type = any(definition.allowed_target_types) then
    raise exception 'Relationship endpoints are not allowed' using errcode = '23514';
  end if;

  if definition.max_targets is not null and (
    select count(*)
    from public.content_relationships r
    where r.source_content_id = new.source_content_id
      and r.relationship_type = new.relationship_type
      and r.id <> new.id
  ) >= definition.max_targets then
    raise exception 'Relationship cardinality exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists content_relationships_validate on public.content_relationships;
create trigger content_relationships_validate
  before insert or update on public.content_relationships
  for each row execute function public.validate_content_relationship();

revoke all on function public.content_effective_type(public.contents) from public;
revoke all on function public.validate_structured_content() from public;
revoke all on function public.validate_content_relationship() from public;

alter table public.content_types enable row level security;
alter table public.content_type_fields enable row level security;
alter table public.content_relationship_types enable row level security;
alter table public.content_relationships enable row level security;
alter table public.content_media_links enable row level security;

revoke all on public.content_types from public, anon;
revoke all on public.content_type_fields from public, anon;
revoke all on public.content_relationship_types from public, anon;
revoke all on public.content_relationships from public, anon;
revoke all on public.content_media_links from public, anon;
grant select on public.content_types to authenticated;
grant select on public.content_type_fields to authenticated;
grant select on public.content_relationship_types to authenticated;
grant select, insert, update, delete on public.content_relationships to authenticated;
grant select, insert, update, delete on public.content_media_links to authenticated;

drop policy if exists content_types_staff_read on public.content_types;
drop policy if exists content_type_fields_staff_read on public.content_type_fields;
drop policy if exists relationship_types_staff_read on public.content_relationship_types;
drop policy if exists content_relationships_staff_read on public.content_relationships;
drop policy if exists content_relationships_staff_insert on public.content_relationships;
drop policy if exists content_relationships_staff_update on public.content_relationships;
drop policy if exists content_relationships_staff_delete on public.content_relationships;
drop policy if exists content_media_links_staff_read on public.content_media_links;
drop policy if exists content_media_links_staff_write on public.content_media_links;

create policy content_types_staff_read on public.content_types
  for select to authenticated using ((select public.has_staff_capability('content.read')));
create policy content_type_fields_staff_read on public.content_type_fields
  for select to authenticated using ((select public.has_staff_capability('content.read')));
create policy relationship_types_staff_read on public.content_relationship_types
  for select to authenticated using ((select public.has_staff_capability('content.read')));

create policy content_relationships_staff_read on public.content_relationships
  for select to authenticated using ((select public.has_staff_capability('content.read')));
create policy content_relationships_staff_insert on public.content_relationships
  for insert to authenticated with check (
    (select public.has_staff_capability('content.update_any'))
    or exists (
      select 1 from public.contents c
      where c.id = source_content_id
        and c.author_id = (select auth.uid())
        and (select public.has_staff_capability('content.update_own'))
    )
  );
create policy content_relationships_staff_update on public.content_relationships
  for update to authenticated
  using (
    (select public.has_staff_capability('content.update_any'))
    or exists (
      select 1 from public.contents c
      where c.id = source_content_id
        and c.author_id = (select auth.uid())
        and (select public.has_staff_capability('content.update_own'))
    )
  )
  with check (
    (select public.has_staff_capability('content.update_any'))
    or exists (
      select 1 from public.contents c
      where c.id = source_content_id
        and c.author_id = (select auth.uid())
        and (select public.has_staff_capability('content.update_own'))
    )
  );
create policy content_relationships_staff_delete on public.content_relationships
  for delete to authenticated using (
    (select public.has_staff_capability('content.delete'))
    or exists (
      select 1 from public.contents c
      where c.id = source_content_id
        and c.author_id = (select auth.uid())
        and (select public.has_staff_capability('content.update_own'))
    )
  );

create policy content_media_links_staff_read on public.content_media_links
  for select to authenticated using ((select public.has_staff_capability('content.read')));
create policy content_media_links_staff_write on public.content_media_links
  for all to authenticated
  using ((select public.has_staff_capability('content.update_any')))
  with check ((select public.has_staff_capability('content.update_any')));

insert into public.content_types (
  key, singular_label, plural_label, description, route_prefix, publication_enabled
)
values
  ('resource', 'Resource', 'Resources', 'Guide, download, template, or reference', 'resources', false),
  ('tool_review', 'Tool review', 'Tool reviews', 'Evidence-backed product or service review', 'reviews', true),
  ('event', 'Event', 'Events', 'Appearance, workshop, launch, or gathering', 'events', false),
  ('interview', 'Interview', 'Interviews', 'Structured interview record', 'interviews', false),
  ('sponsor_profile', 'Sponsor profile', 'Sponsor profiles', 'Reusable sponsor identity and disclosure', 'sponsors', false)
on conflict (key) do nothing;

insert into public.content_type_fields (
  content_type_id, schema_version, key, label, field_type, required_on_publish, position, config
)
select t.id, 1, f.key, f.label, f.field_type, f.required_on_publish, f.position, f.config
from public.content_types t
join (
  values
    ('resource', 'resource_type', 'Resource type', 'select', true, 10, '{"options":["guide","download","template","reference","other"]}'::jsonb),
    ('resource', 'download_url', 'Download URL', 'url', true, 20, '{}'::jsonb),
    ('resource', 'description', 'Description', 'rich_text', false, 30, '{}'::jsonb),
    ('resource', 'version', 'Version', 'text', false, 40, '{}'::jsonb),
    ('resource', 'last_reviewed_date', 'Last reviewed date', 'date', false, 50, '{}'::jsonb),
    ('tool_review', 'pricing_checked_date', 'Pricing checked date', 'date', true, 10, '{}'::jsonb),
    ('tool_review', 'platform_tested', 'Platform tested', 'text', true, 20, '{}'::jsonb),
    ('tool_review', 'what_was_tried', 'What was tried', 'rich_text', true, 30, '{}'::jsonb),
    ('tool_review', 'limitations', 'Limitations', 'rich_text', true, 40, '{}'::jsonb),
    ('tool_review', 'affiliate_disclosure', 'Affiliate disclosure', 'boolean', true, 50, '{}'::jsonb),
    ('tool_review', 'verdict', 'Verdict', 'rich_text', true, 60, '{}'::jsonb),
    ('tool_review', 'product_url', 'Product URL', 'url', false, 70, '{}'::jsonb),
    ('tool_review', 'pricing_summary', 'Pricing summary', 'text', false, 80, '{}'::jsonb),
    ('tool_review', 'sources', 'Sources', 'url_list', false, 90, '{}'::jsonb),
    ('tool_review', 'review_date', 'Review date', 'date', false, 100, '{}'::jsonb),
    ('tool_review', 'update_date', 'Update date', 'date', false, 110, '{}'::jsonb),
    ('event', 'starts_at', 'Starts at', 'datetime', true, 10, '{}'::jsonb),
    ('event', 'timezone', 'Timezone', 'text', true, 20, '{}'::jsonb),
    ('event', 'ends_at', 'Ends at', 'datetime', false, 30, '{}'::jsonb),
    ('event', 'location', 'Location', 'text', false, 40, '{}'::jsonb),
    ('event', 'registration_url', 'Registration URL', 'url', false, 50, '{}'::jsonb),
    ('event', 'is_virtual', 'Virtual event', 'boolean', false, 60, '{}'::jsonb),
    ('interview', 'interviewee_name', 'Interviewee name', 'text', true, 10, '{}'::jsonb),
    ('interview', 'interview_date', 'Interview date', 'date', true, 20, '{}'::jsonb),
    ('interview', 'publication_url', 'Publication URL', 'url', false, 30, '{}'::jsonb),
    ('interview', 'transcript', 'Transcript', 'rich_text', false, 40, '{}'::jsonb),
    ('sponsor_profile', 'organization_name', 'Organization name', 'text', true, 10, '{}'::jsonb),
    ('sponsor_profile', 'website_url', 'Website URL', 'url', true, 20, '{}'::jsonb),
    ('sponsor_profile', 'disclosure_text', 'Disclosure text', 'rich_text', true, 30, '{}'::jsonb),
    ('sponsor_profile', 'contact_name', 'Contact name', 'text', false, 40, '{}'::jsonb),
    ('sponsor_profile', 'contact_email', 'Contact email', 'email', false, 50, '{}'::jsonb)
) as f(type_key, key, label, field_type, required_on_publish, position, config)
  on f.type_key = t.key
on conflict (content_type_id, schema_version, key) do nothing;

insert into public.content_relationship_types (
  key, source_label, target_label, allowed_source_types, allowed_target_types, max_targets
)
values
  ('related_content', 'Related content', 'Related to', array['page','post','resource','tool_review','event','interview'], array['page','post','resource','tool_review','event','interview'], null),
  ('uses_resource', 'Uses resource', 'Used by', array['page','post','tool_review','event','interview'], array['resource'], null),
  ('sponsored_by', 'Sponsored by', 'Sponsors', array['page','post','resource','tool_review','event','interview'], array['sponsor_profile'], 1)
on conflict (key) do nothing;

comment on column public.contents.structured_fields is
  'Versioned working fields for kind=custom only. Public rendering must use a published snapshot.';

update public.content_types
set publication_enabled = true
where key = 'tool_review';

-- Freeze structured identity into the published snapshot after the custom columns exist.
create or replace function public.snapshot_content_public_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  public_taxonomies jsonb;
  type_key text;
  route_prefix text;
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

  if new.kind = 'custom' then
    select t.key, t.route_prefix into type_key, route_prefix
    from public.content_types t
    where t.id = new.content_type_id;
  end if;

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
      'taxonomies', public_taxonomies,
      'content_type_key', type_key,
      'public_path', case
        when type_key is not null and route_prefix is not null then '/' || route_prefix || '/' || new.slug
        else null
      end,
      'structured_schema_version', new.structured_schema_version,
      'structured_fields', case when new.kind = 'custom' then new.structured_fields else null end
    )
  );
  return new;
end;
$$;

drop view if exists public.published_contents;
create view public.published_contents
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
