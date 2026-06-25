create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jersey_sizes (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues(id) on delete set null,
  name text not null,
  slug text not null unique,
  country text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, name)
);

alter table public.products
  add column if not exists league_id uuid references public.leagues(id) on delete set null,
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists season_id uuid references public.seasons(id) on delete set null;

create index if not exists teams_league_id_idx on public.teams(league_id);
create index if not exists products_league_id_idx on public.products(league_id);
create index if not exists products_team_id_idx on public.products(team_id);
create index if not exists products_season_id_idx on public.products(season_id);

drop trigger if exists leagues_set_updated_at on public.leagues;
create trigger leagues_set_updated_at before update on public.leagues
for each row execute function public.set_updated_at();

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists seasons_set_updated_at on public.seasons;
create trigger seasons_set_updated_at before update on public.seasons
for each row execute function public.set_updated_at();

drop trigger if exists jersey_sizes_set_updated_at on public.jersey_sizes;
create trigger jersey_sizes_set_updated_at before update on public.jersey_sizes
for each row execute function public.set_updated_at();

alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.seasons enable row level security;
alter table public.jersey_sizes enable row level security;

grant select on public.leagues, public.teams, public.seasons, public.jersey_sizes to anon, authenticated;
grant select, insert, update, delete on public.leagues, public.teams, public.seasons, public.jersey_sizes to authenticated;

drop policy if exists "Public can view leagues" on public.leagues;
create policy "Public can view leagues"
on public.leagues for select
to anon, authenticated
using (true);

drop policy if exists "Public can view teams" on public.teams;
create policy "Public can view teams"
on public.teams for select
to anon, authenticated
using (true);

drop policy if exists "Public can view seasons" on public.seasons;
create policy "Public can view seasons"
on public.seasons for select
to anon, authenticated
using (true);

drop policy if exists "Public can view jersey sizes" on public.jersey_sizes;
create policy "Public can view jersey sizes"
on public.jersey_sizes for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage leagues" on public.leagues;
create policy "Admins manage leagues"
on public.leagues for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins manage teams" on public.teams;
create policy "Admins manage teams"
on public.teams for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins manage seasons" on public.seasons;
create policy "Admins manage seasons"
on public.seasons for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins manage jersey sizes" on public.jersey_sizes;
create policy "Admins manage jersey sizes"
on public.jersey_sizes for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

insert into public.leagues (name, slug, sort_order)
values
  ('World Cup', 'world-cup', 10),
  ('Premier League', 'premier-league', 20),
  ('La Liga', 'la-liga', 30),
  ('Serie A', 'serie-a', 40),
  ('Bundesliga', 'bundesliga', 50)
on conflict (slug) do nothing;

insert into public.seasons (name, slug, sort_order)
values
  ('2024/25', '2024-25', 10),
  ('2025/26', '2025-26', 20),
  ('2026', '2026', 30)
on conflict (slug) do nothing;

insert into public.jersey_sizes (label, sort_order)
values
  ('S', 10),
  ('M', 20),
  ('L', 30),
  ('XL', 40),
  ('2XL', 50)
on conflict (label) do nothing;
