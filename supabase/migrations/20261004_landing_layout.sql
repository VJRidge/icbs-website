-- Landing layout for studio pages + a settings pointer for the /free kit page.

alter table public.contents
  add column if not exists layout text not null default 'article';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contents_layout_check') then
    alter table public.contents
      add constraint contents_layout_check check (layout in ('article', 'landing'));
  end if;
end $$;

alter table public.settings
  add column if not exists kit_content_id uuid references public.contents(id) on delete set null;
