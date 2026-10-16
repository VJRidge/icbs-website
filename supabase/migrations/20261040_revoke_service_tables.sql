-- Re-assert service-role-only access on funnel/rate-limit/preview tables.

do $$
begin
  if to_regclass('public.subscribers') is not null then
    revoke all on table public.subscribers from anon, authenticated;
  end if;
  if to_regclass('public.rate_limit_buckets') is not null then
    revoke all on table public.rate_limit_buckets from anon, authenticated;
  end if;
  if to_regclass('public.content_previews') is not null then
    revoke all on table public.content_previews from anon, authenticated;
  end if;
end $$;
