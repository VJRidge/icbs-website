-- First Auth user becomes studio owner. Later sign-ups stay unapproved.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  if not exists (select 1 from public.profiles where staff_approved = true) then
    update public.profiles
    set role = 'owner', staff_approved = true
    where id = new.id;
  end if;
  return new;
end;
$$;

insert into public.profiles (id, display_name)
select u.id, split_part(u.email, '@', 1)
from auth.users u
on conflict (id) do nothing;

update public.profiles
set role = 'owner', staff_approved = true
where id = (select id from auth.users order by created_at asc limit 1)
  and not exists (select 1 from public.profiles where staff_approved = true);
