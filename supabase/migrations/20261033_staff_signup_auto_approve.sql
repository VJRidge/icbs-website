-- Open studio signup: new Auth users are auto-approved (no manual Approve click).
-- Access still requires a confirmed email in the app, plus disabled_at kill switch.
-- Bot friction lives in /api/staff-signup (CAPTCHA, honeypot, disposable block, rate limit).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, staff_approved, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    true,
    'author'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        staff_approved = true;
  return new;
end;
$$;

-- Existing pending accounts that are not disabled can work without a re-approve click.
update public.profiles
set staff_approved = true
where staff_approved = false
  and disabled_at is null;
