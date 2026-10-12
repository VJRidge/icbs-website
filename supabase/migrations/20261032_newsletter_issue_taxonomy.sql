-- Newsletter issues: name, topic/category, subcategory, auto issue #.
-- Align category seed with the operator topic list.

alter table public.newsletter_issues
  add column if not exists name text not null default 'New Name';

alter table public.newsletter_issues
  add column if not exists taxonomy_id uuid references public.taxonomies (id) on delete set null;

alter table public.newsletter_issues
  add column if not exists subcategory text not null default '';

alter table public.newsletter_issues
  add column if not exists series_id uuid references public.series (id) on delete set null;

alter table public.newsletter_issues
  add column if not exists issue_number integer;

create index if not exists newsletter_issues_taxonomy_idx
  on public.newsletter_issues (taxonomy_id);

create index if not exists newsletter_issues_series_idx
  on public.newsletter_issues (series_id);

-- One issue number per topic (category); null taxonomy may share numbers.
create unique index if not exists newsletter_issues_taxonomy_number_uidx
  on public.newsletter_issues (taxonomy_id, issue_number)
  where taxonomy_id is not null and issue_number is not null;

create or replace function public.next_newsletter_issue_number(p_taxonomy_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(issue_number), 0) + 1
  from public.newsletter_issues
  where taxonomy_id is not distinct from p_taxonomy_id;
$$;

revoke all on function public.next_newsletter_issue_number(uuid) from public;
grant execute on function public.next_newsletter_issue_number(uuid) to authenticated;

-- Reseed topics to the operator list (spelling: Hardware, SaaS).
delete from public.taxonomies t
where t.kind = 'category'
  and t.slug in ('crypto', 'tools-platforms')
  and not exists (
    select 1 from public.content_taxonomies ct where ct.taxonomy_id = t.id
  )
  and not exists (
    select 1 from public.contact_interests ci where ci.taxonomy_id = t.id
  )
  and not exists (
    select 1 from public.newsletter_issues ni where ni.taxonomy_id = t.id
  );

insert into public.taxonomies (kind, slug, name, description, sort_order)
values
  ('category', 'ai', 'AI', 'Articles about artificial intelligence.', 10),
  ('category', 'vibe-coding', 'Vibe Coding', 'Building with AI-assisted coding workflows.', 20),
  ('category', 'prompts', 'Prompts', 'Prompt craft, libraries, and patterns.', 30),
  ('category', 'ai-agents', 'AI Agents', 'Autonomous and agentic AI systems.', 40),
  ('category', 'platforms', 'Platforms', 'Platform reviews, comparisons, and tutorials.', 50),
  ('category', 'hardware', 'Hardware', 'Devices, chips, and physical tech.', 60),
  ('category', 'software', 'Software', 'Apps, OS, and software tooling.', 70),
  ('category', 'gadgets', 'Gadgets', 'Consumer gadgets and gear.', 80),
  ('category', 'tech', 'Tech', 'General technology coverage.', 90),
  ('category', 'saas', 'SaaS', 'Software-as-a-service products and stacks.', 100)
on conflict (kind, slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- Backfill newsletter name from subject when still default-ish.
update public.newsletter_issues
set name = case
  when coalesce(nullif(trim(name), ''), '') = '' or name = 'New Name'
    then case when trim(subject) = '' or subject = 'Untitled issue' then 'New Name' else subject end
  else name
end
where true;
