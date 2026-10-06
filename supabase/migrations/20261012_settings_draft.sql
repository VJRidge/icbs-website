-- Phase 5b: settings draft document so studio edits do not silently change live chrome.

alter table public.settings
  add column if not exists draft_document jsonb,
  add column if not exists settings_version int not null default 1;

alter table public.settings
  drop constraint if exists settings_draft_document_object;
alter table public.settings
  add constraint settings_draft_document_object check (
    draft_document is null or jsonb_typeof(draft_document) = 'object'
  );

comment on column public.settings.draft_document is
  'Pending site settings snapshot. Public readers use live columns until an explicit publish.';
comment on column public.settings.settings_version is
  'Optimistic lock for settings draft/publish writes.';

-- Seed draft from current live values when missing so first open has a working copy.
update public.settings
set draft_document = jsonb_build_object(
  'site_name', site_name,
  'site_description', site_description,
  'timezone', timezone,
  'date_format', date_format,
  'homepage_content_id', homepage_content_id,
  'kit_content_id', kit_content_id
)
where draft_document is null;
