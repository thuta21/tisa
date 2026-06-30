create table if not exists public.commerce_settings (
  id boolean primary key default true check (id),
  customization_price integer not null default 2 check (customization_price >= 0),
  arm_badge_price integer not null default 5 check (arm_badge_price >= 0),
  updated_at timestamptz not null default now()
);

insert into public.commerce_settings (id, customization_price, arm_badge_price)
values (true, 2, 5)
on conflict (id) do nothing;

alter table public.order_items
add column if not exists arm_badge text check (arm_badge in ('ucl', 'epl')),
add column if not exists customization_fee integer not null default 0 check (customization_fee >= 0),
add column if not exists arm_badge_fee integer not null default 0 check (arm_badge_fee >= 0);

create trigger commerce_settings_set_updated_at before update on public.commerce_settings
for each row execute function public.set_updated_at();

alter table public.commerce_settings enable row level security;

grant select, insert, update on public.commerce_settings to authenticated;

create policy "Admins manage commerce settings"
on public.commerce_settings for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
