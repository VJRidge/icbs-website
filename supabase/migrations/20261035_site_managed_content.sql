-- Staff-editable blobs for hardcoded public surfaces (downloads map, book updates, etc.).

create table if not exists public.site_managed_content (
  key text primary key,
  kind text not null check (kind in ('download_map', 'book_updates', 'resource_meta', 'json')),
  document jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create index if not exists site_managed_content_kind_idx
  on public.site_managed_content (kind);

alter table public.site_managed_content enable row level security;

drop policy if exists site_managed_content_select_public on public.site_managed_content;
create policy site_managed_content_select_public
  on public.site_managed_content
  for select
  to anon, authenticated
  using (true);

drop policy if exists site_managed_content_staff_write on public.site_managed_content;
create policy site_managed_content_staff_write
  on public.site_managed_content
  for all
  to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

grant select on public.site_managed_content to anon, authenticated;
grant insert, update, delete on public.site_managed_content to authenticated;

comment on table public.site_managed_content is
  'Editable overrides for hardcoded public surfaces (download URLs, book update entries).';
