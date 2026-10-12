-- Phase 8e: Stripe Checkout purchases (book PDF).
-- Fulfillment via webhook; kit subscribers gain buyer tag; never requires key at migrate time.

create table if not exists public.purchases (
  id                   uuid primary key default gen_random_uuid(),
  stripe_session_id    text not null,
  stripe_payment_intent text,
  email                citext not null,
  product_key          text not null default 'i_call_bs_book',
  amount_total         int,
  currency             text,
  status               text not null default 'pending',
  fulfilled_at         timestamptz,
  meta                 jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint purchases_session_uidx unique (stripe_session_id),
  constraint purchases_status_check
    check (status in ('pending', 'paid', 'fulfilled', 'failed')),
  constraint purchases_product_check
    check (product_key in ('i_call_bs_book'))
);

create index if not exists purchases_email_idx
  on public.purchases (email, created_at desc);

create index if not exists purchases_status_idx
  on public.purchases (status, created_at desc);

alter table public.purchases enable row level security;

drop policy if exists purchases_staff on public.purchases;
create policy purchases_staff on public.purchases
  for select to authenticated
  using (public.has_staff_capability('content.read'));

insert into public.metric_definitions (key, label, description, event_name)
values
  ('book_purchases', 'Book purchases', 'Paid Stripe Checkout sessions fulfilled for the book PDF', 'book_purchase')
on conflict (key) do nothing;
