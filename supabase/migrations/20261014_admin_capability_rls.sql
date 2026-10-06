-- Extend Phase 2 capability RLS from contents/profiles to remaining admin tables.
-- Replaces coarse is_staff() gates with has_staff_capability() so authors cannot
-- mutate live chrome, templates, taxonomy definitions, or forms.

-- Media: read for content.read; create for content.create; update/delete own or any.
drop policy if exists media_staff_all on public.media;
drop policy if exists media_staff_read on public.media;
drop policy if exists media_staff_insert on public.media;
drop policy if exists media_staff_update on public.media;
drop policy if exists media_staff_delete on public.media;

create policy media_staff_read on public.media
  for select to authenticated
  using (public.has_staff_capability('content.read'));

create policy media_staff_insert on public.media
  for insert to authenticated
  with check (public.has_staff_capability('content.create'));

create policy media_staff_update on public.media
  for update to authenticated
  using (
    public.has_staff_capability('content.update_any')
    or (
      public.has_staff_capability('content.update_own')
      and created_by = (select auth.uid())
    )
  )
  with check (
    public.has_staff_capability('content.update_any')
    or (
      public.has_staff_capability('content.update_own')
      and created_by = (select auth.uid())
    )
  );

create policy media_staff_delete on public.media
  for delete to authenticated
  using (
    public.has_staff_capability('content.delete')
    or (
      public.has_staff_capability('content.update_own')
      and created_by = (select auth.uid())
    )
  );

drop policy if exists media_usages_staff on public.media_usages;
drop policy if exists media_usages_staff_read on public.media_usages;
drop policy if exists media_usages_staff_write on public.media_usages;

create policy media_usages_staff_read on public.media_usages
  for select to authenticated
  using (public.has_staff_capability('content.read'));

create policy media_usages_staff_write on public.media_usages
  for all to authenticated
  using (
    public.has_staff_capability('content.update_any')
    or public.has_staff_capability('content.create')
  )
  with check (
    public.has_staff_capability('content.update_any')
    or public.has_staff_capability('content.create')
  );

-- Site chrome: live-facing; require publish.
drop policy if exists menus_staff on public.menus;
create policy menus_staff on public.menus
  for all to authenticated
  using (public.has_staff_capability('content.publish'))
  with check (public.has_staff_capability('content.publish'));

drop policy if exists redirects_staff on public.redirects;
create policy redirects_staff on public.redirects
  for all to authenticated
  using (public.has_staff_capability('content.publish'))
  with check (public.has_staff_capability('content.publish'));

drop policy if exists settings_staff_update on public.settings;
create policy settings_staff_update on public.settings
  for update to authenticated
  using (public.has_staff_capability('content.publish'))
  with check (public.has_staff_capability('content.publish'));

-- Templates and taxonomy definitions: update_any (not authors).
drop policy if exists templates_staff on public.templates;
create policy templates_staff on public.templates
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists taxonomies_staff on public.taxonomies;
create policy taxonomies_staff on public.taxonomies
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

-- Content↔taxonomy links: same ownership rules as content updates.
drop policy if exists content_taxonomies_staff on public.content_taxonomies;
create policy content_taxonomies_staff on public.content_taxonomies
  for all to authenticated
  using (
    public.has_staff_capability('content.update_any')
    or exists (
      select 1 from public.contents c
      where c.id = content_id
        and c.author_id = (select auth.uid())
        and public.has_staff_capability('content.update_own')
    )
  )
  with check (
    public.has_staff_capability('content.update_any')
    or exists (
      select 1 from public.contents c
      where c.id = content_id
        and c.author_id = (select auth.uid())
        and public.has_staff_capability('content.update_own')
    )
  );

-- Short links: create or update_any.
drop policy if exists cms_short_links_staff_all on public.cms_short_links;
create policy cms_short_links_staff_all on public.cms_short_links
  for all to authenticated
  using (
    public.has_staff_capability('content.update_any')
    or public.has_staff_capability('content.create')
  )
  with check (
    public.has_staff_capability('content.update_any')
    or public.has_staff_capability('content.create')
  );

-- Revisions: read with content.read; write with create/update_any.
drop policy if exists revisions_staff on public.content_revisions;
drop policy if exists revisions_staff_read on public.content_revisions;
drop policy if exists revisions_staff_write on public.content_revisions;

create policy revisions_staff_read on public.content_revisions
  for select to authenticated
  using (public.has_staff_capability('content.read'));

create policy revisions_staff_write on public.content_revisions
  for all to authenticated
  using (
    public.has_staff_capability('content.update_any')
    or public.has_staff_capability('content.create')
  )
  with check (
    public.has_staff_capability('content.update_any')
    or public.has_staff_capability('content.create')
  );

-- Activity log: staff with content.read may read/write audit rows.
drop policy if exists activity_staff on public.activity_log;
create policy activity_staff on public.activity_log
  for all to authenticated
  using (public.has_staff_capability('content.read'))
  with check (public.has_staff_capability('content.read'));

-- Forms tables exist but the module is gated; keep writes on update_any.
drop policy if exists forms_staff on public.forms;
create policy forms_staff on public.forms
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

drop policy if exists submissions_staff on public.form_submissions;
create policy submissions_staff on public.form_submissions
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));
