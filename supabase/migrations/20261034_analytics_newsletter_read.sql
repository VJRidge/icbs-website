-- Analytics staff (content.read) can select newsletter delivery rows.
-- Index provider message ids for Resend webhook → job/issue linkage.

create index if not exists newsletter_send_jobs_provider_msg_idx
  on public.newsletter_send_jobs (provider_message_id)
  where provider_message_id is not null;

create index if not exists newsletter_provider_events_issue_time_idx
  on public.newsletter_provider_events (issue_id, occurred_at desc)
  where issue_id is not null;

create index if not exists newsletter_provider_events_type_time_idx
  on public.newsletter_provider_events (event_type, occurred_at desc);

drop policy if exists newsletter_issues_staff_read on public.newsletter_issues;
create policy newsletter_issues_staff_read on public.newsletter_issues
  for select to authenticated
  using (public.has_staff_capability('content.read'));

drop policy if exists newsletter_send_jobs_staff_read on public.newsletter_send_jobs;
create policy newsletter_send_jobs_staff_read on public.newsletter_send_jobs
  for select to authenticated
  using (public.has_staff_capability('content.read'));

drop policy if exists newsletter_provider_events_staff_read on public.newsletter_provider_events;
create policy newsletter_provider_events_staff_read on public.newsletter_provider_events
  for select to authenticated
  using (public.has_staff_capability('content.read'));
