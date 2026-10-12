-- Static contact lists: membership rows + list_kind on audience_segments.
-- Dynamic lists keep rule definitions; static lists use audience_segment_members.

alter table public.audience_segments
  add column if not exists list_kind text not null default 'dynamic';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audience_segments_list_kind_check'
  ) then
    alter table public.audience_segments
      add constraint audience_segments_list_kind_check
      check (list_kind in ('dynamic', 'static'));
  end if;
end $$;

create table if not exists public.audience_segment_members (
  segment_id uuid not null references public.audience_segments (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (segment_id, contact_id)
);

create index if not exists audience_segment_members_contact_idx
  on public.audience_segment_members (contact_id);

alter table public.audience_segment_members enable row level security;

drop policy if exists audience_segment_members_staff on public.audience_segment_members;
create policy audience_segment_members_staff on public.audience_segment_members
  for all to authenticated
  using (public.has_staff_capability('content.update_any'))
  with check (public.has_staff_capability('content.update_any'));

insert into public.contact_tags (slug, label)
values ('csv-import', 'CSV import')
on conflict (slug) do nothing;
