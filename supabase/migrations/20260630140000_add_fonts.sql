create table if not exists public.fonts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  font_url text not null,
  price integer not null default 0 check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fonts enable row level security;

drop policy if exists "Anyone can select fonts" on public.fonts;
create policy "Anyone can select fonts"
  on public.fonts for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage fonts" on public.fonts;
create policy "Admins manage fonts"
  on public.fonts for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select on public.fonts to anon;
grant select, insert, update, delete on public.fonts to authenticated;

drop trigger if exists fonts_set_updated_at on public.fonts;
create trigger fonts_set_updated_at before update on public.fonts
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fonts',
  'fonts',
  true,
  10485760, -- 10MB
  array['font/ttf', 'application/x-font-ttf', 'application/x-font-truetype', 'font/sfnt', 'application/octet-stream']
)
on conflict (id) do nothing;

drop policy if exists "Admins upload font files" on storage.objects;
create policy "Admins upload font files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'fonts' and private.is_admin());

drop policy if exists "Admins update font files" on storage.objects;
create policy "Admins update font files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'fonts' and private.is_admin())
  with check (bucket_id = 'fonts' and private.is_admin());

drop policy if exists "Admins delete font files" on storage.objects;
create policy "Admins delete font files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fonts' and private.is_admin());
