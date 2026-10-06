-- Tighten 20261014 admin capability policies that were over-broad for authors.

-- Templates: authors need SELECT for the section picker; mutations stay update_any.
drop policy if exists templates_staff on public.templates;
create policy templates_staff_read on public.templates
  for select to authenticated
  using (public.has_staff_capability('content.read'));
create policy templates_staff_write on public.templates
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

-- Short links: authors may create; retarget/delete requires update_any.
drop policy if exists cms_short_links_staff_all on public.cms_short_links;
create policy cms_short_links_staff_read on public.cms_short_links
  for select to authenticated
  using (public.has_staff_capability('content.read'));
create policy cms_short_links_staff_insert on public.cms_short_links
  for insert to authenticated
  with check (public.has_staff_capability('content.create'));
create policy cms_short_links_staff_update on public.cms_short_links
  for update to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));
create policy cms_short_links_staff_delete on public.cms_short_links
  for delete to authenticated
  using (public.has_staff_capability('content.update_any'));

-- Revisions: read for content.read; write scoped to own content or update_any.
drop policy if exists revisions_staff on public.content_revisions;
drop policy if exists revisions_staff_read on public.content_revisions;
drop policy if exists revisions_staff_write on public.content_revisions;

create policy revisions_staff_read on public.content_revisions
  for select to authenticated
  using (public.has_staff_capability('content.read'));

create policy revisions_staff_insert on public.content_revisions
  for insert to authenticated
  with check (
    public.has_staff_capability('content.update_any')
    or exists (
      select 1 from public.contents c
      where c.id = content_id
        and c.author_id = (select auth.uid())
        and (
          public.has_staff_capability('content.update_own')
          or public.has_staff_capability('content.create')
        )
    )
  );

create policy revisions_staff_mutate on public.content_revisions
  for update to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

create policy revisions_staff_delete on public.content_revisions
  for delete to authenticated
  using (public.has_staff_capability('content.update_any'));

-- Media usages: authors may insert links; delete requires update_any.
drop policy if exists media_usages_staff on public.media_usages;
drop policy if exists media_usages_staff_read on public.media_usages;
drop policy if exists media_usages_staff_write on public.media_usages;

create policy media_usages_staff_read on public.media_usages
  for select to authenticated
  using (public.has_staff_capability('content.read'));

create policy media_usages_staff_insert on public.media_usages
  for insert to authenticated
  with check (
    public.has_staff_capability('content.update_any')
    or public.has_staff_capability('content.create')
  );

create policy media_usages_staff_update on public.media_usages
  for update to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

create policy media_usages_staff_delete on public.media_usages
  for delete to authenticated
  using (public.has_staff_capability('content.update_any'));

-- Activity log: append + read only; no rewrite or purge via content.read.
drop policy if exists activity_staff on public.activity_log;
create policy activity_staff_read on public.activity_log
  for select to authenticated
  using (public.has_staff_capability('content.read'));
create policy activity_staff_insert on public.activity_log
  for insert to authenticated
  with check (public.has_staff_capability('content.read'));
