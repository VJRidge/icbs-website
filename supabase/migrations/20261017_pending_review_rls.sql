-- Allow pending_review without content.publish (authors may submit).
drop policy if exists contents_staff_insert on public.contents;
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
      or status in ('draft', 'trash', 'pending_review')
    )
  );

drop policy if exists contents_staff_update on public.contents;
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
      or status in ('draft', 'trash', 'pending_review')
    )
  );

comment on type public.content_status is
  'draft | pending_review | published | scheduled | trash';
