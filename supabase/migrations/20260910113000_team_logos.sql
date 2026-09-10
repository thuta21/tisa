alter table public.teams
  add column if not exists logo_path text;

comment on column public.teams.logo_path is
  'Path relative to the public team-logos Supabase Storage bucket.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-logos',
  'team-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public view team logos" on storage.objects;
create policy "Public view team logos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'team-logos');

drop policy if exists "Admins upload team logos" on storage.objects;
create policy "Admins upload team logos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'team-logos' and private.is_admin());

drop policy if exists "Admins update team logos" on storage.objects;
create policy "Admins update team logos"
on storage.objects for update
to authenticated
using (bucket_id = 'team-logos' and private.is_admin())
with check (bucket_id = 'team-logos' and private.is_admin());

drop policy if exists "Admins delete team logos" on storage.objects;
create policy "Admins delete team logos"
on storage.objects for delete
to authenticated
using (bucket_id = 'team-logos' and private.is_admin());

with team_logo_seed(league_slug, name, slug, country, sort_order, logo_path) as (
  values
    ('premier-league', 'Arsenal', 'arsenal', 'England', 10, 'premier-league/arsenal.png'),
    ('premier-league', 'Aston Villa', 'aston-villa', 'England', 20, 'premier-league/aston-villa.png'),
    ('premier-league', 'Bournemouth', 'bournemouth', 'England', 30, 'premier-league/bournemouth.png'),
    ('premier-league', 'Brentford', 'brentford', 'England', 40, 'premier-league/brentford.png'),
    ('premier-league', 'Brighton & Hove Albion', 'brighton-and-hove-albion', 'England', 50, 'premier-league/brighton-and-hove-albion.png'),
    ('premier-league', 'Chelsea', 'chelsea', 'England', 60, 'premier-league/chelsea.png'),
    ('premier-league', 'Coventry City', 'coventry-city', 'England', 70, 'premier-league/coventry-city.png'),
    ('premier-league', 'Crystal Palace', 'crystal-palace', 'England', 80, 'premier-league/crystal-palace.png'),
    ('premier-league', 'Everton', 'everton', 'England', 90, 'premier-league/everton.png'),
    ('premier-league', 'Fulham', 'fulham', 'England', 100, 'premier-league/fulham.png'),
    ('premier-league', 'Hull City', 'hull-city', 'England', 110, 'premier-league/hull-city.png'),
    ('premier-league', 'Ipswich Town', 'ipswich-town', 'England', 120, 'premier-league/ipswich-town.png'),
    ('premier-league', 'Leeds United', 'leeds-united', 'England', 130, 'premier-league/leeds-united.png'),
    ('premier-league', 'Liverpool', 'liverpool', 'England', 140, 'premier-league/liverpool.png'),
    ('premier-league', 'Manchester City', 'manchester-city', 'England', 150, 'premier-league/manchester-city.png'),
    ('premier-league', 'Manchester United', 'manchester-united', 'England', 160, 'premier-league/manchester-united.png'),
    ('premier-league', 'Newcastle United', 'newcastle-united', 'England', 170, 'premier-league/newcastle-united.png'),
    ('premier-league', 'Nottingham Forest', 'nottingham-forest', 'England', 180, 'premier-league/nottingham-forest.png'),
    ('premier-league', 'Sunderland', 'sunderland', 'England', 190, 'premier-league/sunderland.png'),
    ('premier-league', 'Tottenham Hotspur', 'tottenham-hotspur', 'England', 200, 'premier-league/tottenham-hotspur.png'),
    ('la-liga', 'Atletico Madrid', 'atletico-madrid', 'Spain', 10, 'la-liga/atletico-madrid.png'),
    ('la-liga', 'Barcelona', 'barcelona', 'Spain', 20, 'la-liga/barcelona.png'),
    ('la-liga', 'Real Madrid', 'real-madrid', 'Spain', 30, 'la-liga/real-madrid.png'),
    ('world-cup', 'Argentina', 'argentina', 'Argentina', 10, 'world-cup/argentina.png'),
    ('world-cup', 'Brazil', 'brazil', 'Brazil', 20, 'world-cup/brazil.png'),
    ('world-cup', 'France', 'france', 'France', 30, 'world-cup/france.png'),
    ('world-cup', 'Germany', 'germany', 'Germany', 40, 'world-cup/germany.png'),
    ('world-cup', 'Portugal', 'portugal', 'Portugal', 50, 'world-cup/portugal.png'),
    ('world-cup', 'Spain', 'spain', 'Spain', 60, 'world-cup/spain.png')
)
insert into public.teams (league_id, name, slug, country, sort_order, logo_path)
select leagues.id, seed.name, seed.slug, seed.country, seed.sort_order, seed.logo_path
from team_logo_seed seed
join public.leagues on leagues.slug = seed.league_slug
on conflict (slug) do update set
  league_id = coalesce(public.teams.league_id, excluded.league_id),
  country = coalesce(public.teams.country, excluded.country),
  logo_path = excluded.logo_path;

update public.teams
set logo_path = case
  when slug in ('man-u', 'man-united') then 'premier-league/manchester-united.png'
  when slug in ('man-city', 'mancity') then 'premier-league/manchester-city.png'
  when slug in ('brighton', 'brighton-hove-albion') then 'premier-league/brighton-and-hove-albion.png'
  when slug in ('spur', 'spurs', 'tottenham') then 'premier-league/tottenham-hotspur.png'
  when slug = 'newcastle' then 'premier-league/newcastle-united.png'
  when slug = 'nottingham' then 'premier-league/nottingham-forest.png'
  else logo_path
end
where slug in (
  'man-u', 'man-united', 'man-city', 'mancity', 'brighton',
  'brighton-hove-albion', 'spur', 'spurs', 'tottenham', 'newcastle', 'nottingham'
);
