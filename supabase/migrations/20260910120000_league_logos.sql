alter table public.leagues
  add column if not exists logo_path text;

comment on column public.leagues.logo_path is
  'Path relative to the public league-logos Supabase Storage bucket.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'league-logos',
  'league-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public view league logos" on storage.objects;
create policy "Public view league logos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'league-logos');

drop policy if exists "Admins upload league logos" on storage.objects;
create policy "Admins upload league logos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'league-logos' and private.is_admin());

drop policy if exists "Admins update league logos" on storage.objects;
create policy "Admins update league logos"
on storage.objects for update
to authenticated
using (bucket_id = 'league-logos' and private.is_admin())
with check (bucket_id = 'league-logos' and private.is_admin());

drop policy if exists "Admins delete league logos" on storage.objects;
create policy "Admins delete league logos"
on storage.objects for delete
to authenticated
using (bucket_id = 'league-logos' and private.is_admin());

insert into public.leagues (name, slug, sort_order, logo_path)
values
  ('World Cup', 'world-cup', 10, 'world-cup.png'),
  ('Premier League', 'premier-league', 20, 'premier-league.png'),
  ('La Liga', 'la-liga', 30, 'la-liga.png')
on conflict (slug) do update set logo_path = excluded.logo_path;
