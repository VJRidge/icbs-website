-- Phase 7a: lead-capture Forms foundation.
-- Extends existing forms / form_submissions; adds durable rate_limit_buckets.
-- Does not touch subscribers or kit delivery.

alter table public.forms
  add column if not exists slug text,
  add column if not exists status text not null default 'draft',
  add column if not exists version int not null default 1,
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'forms_status_check'
  ) then
    alter table public.forms
      add constraint forms_status_check
      check (status in ('draft', 'published'));
  end if;
end $$;

update public.forms
set slug = lower(regexp_replace(coalesce(nullif(trim(title), ''), 'form') || '-' || substr(id::text, 1, 8), '[^a-z0-9]+', '-', 'g'))
where slug is null or trim(slug) = '';

alter table public.forms alter column slug set not null;

create unique index if not exists forms_slug_uidx on public.forms (slug);

alter table public.form_submissions
  add column if not exists form_version int not null default 1,
  add column if not exists consent jsonb not null default '{}'::jsonb,
  add column if not exists utm jsonb not null default '{}'::jsonb,
  add column if not exists ip_hash text,
  add column if not exists user_agent text;

create table if not exists public.rate_limit_buckets (
  bucket_key   text not null,
  window_start timestamptz not null,
  hit_count    int not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (bucket_key, window_start)
);

alter table public.rate_limit_buckets enable row level security;
-- No client policies: service-role API only.

-- Seed published lead-capture form (idempotent by slug).
insert into public.forms (title, slug, status, version, fields, settings, published_at)
select
  'Lead capture',
  'lead-capture',
  'published',
  1,
  '[
    {"key":"firstName","type":"text","label":"First name","required":true,"maxLength":80},
    {"key":"email","type":"email","label":"Email","required":true,"maxLength":200},
    {"key":"marketingConsent","type":"consent","label":"I agree to receive occasional updates about free resources and the book.","required":true}
  ]'::jsonb,
  '{
    "successMessage":"Thanks — you are on the list.",
    "honeypotKey":"company",
    "consentText":"I agree to receive occasional updates about free resources and the book."
  }'::jsonb,
  now()
where not exists (select 1 from public.forms where slug = 'lead-capture');

-- Durable rate-limit helper (service role / definer). Returns true when limited.
create or replace function public.rate_limit_hit(
  p_key text,
  p_window_seconds int default 900,
  p_max_hits int default 8
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  if p_key is null or length(trim(p_key)) = 0 then
    return true;
  end if;
  if p_window_seconds < 30 then p_window_seconds := 30; end if;
  if p_window_seconds > 86400 then p_window_seconds := 86400; end if;
  if p_max_hits < 1 then p_max_hits := 1; end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_buckets (bucket_key, window_start, hit_count, updated_at)
  values (left(trim(p_key), 200), v_window_start, 1, now())
  on conflict (bucket_key, window_start)
  do update set
    hit_count = public.rate_limit_buckets.hit_count + 1,
    updated_at = now()
  returning hit_count into v_count;

  return v_count > p_max_hits;
end;
$$;

revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

-- Keep forms RLS on update_any (already applied in 20261014).
