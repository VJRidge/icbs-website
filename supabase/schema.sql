-- I Call BS site: subscribers table.
-- Run this once in the Supabase SQL editor (or as a migration).

create extension if not exists citext;

create table if not exists public.subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             citext not null unique,
  first_name        text,
  tags              text[] not null default '{kit}',   -- 'kit' on signup, 'buyer' added on purchase
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  utm_content       text,
  consent_at        timestamptz not null default now(),
  unsubscribe_token uuid not null default gen_random_uuid(),
  unsubscribed_at   timestamptz,
  sequence_step     int not null default 1,            -- last welcome email sent (1 = kit delivery)
  last_email_at     timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists subscribers_sequence_idx
  on public.subscribers (sequence_step, last_email_at)
  where unsubscribed_at is null;

-- Row Level Security on, with NO policies: the browser (anon key) can't read or
-- write this table at all. Only the server functions, which use the service
-- role key, can. Test it: an anon-key select must return zero rows.
alter table public.subscribers enable row level security;
