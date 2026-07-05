create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.payment_methods (name, slug, is_active, sort_order)
values
  ('Cash on Delivery (COD)', 'cod', true, 10),
  ('Bank Pay', 'bank_pay', true, 20)
on conflict (slug) do update set
  name = excluded.name,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

alter table public.orders
alter column payment_method drop default;

alter table public.orders
alter column payment_method type text
using payment_method::text;

alter table public.orders
alter column payment_method set default 'cod';

alter table public.orders
drop constraint if exists orders_payment_method_fkey;

alter table public.orders
add constraint orders_payment_method_fkey
foreign key (payment_method) references public.payment_methods(slug)
on update cascade
on delete restrict;

alter table public.payment_methods enable row level security;

grant select on public.payment_methods to anon, authenticated;
grant insert, update, delete on public.payment_methods to authenticated;

drop policy if exists "Anyone views active payment methods" on public.payment_methods;
create policy "Anyone views active payment methods"
on public.payment_methods for select
to anon, authenticated
using (is_active);

drop policy if exists "Admins manage payment methods" on public.payment_methods;
create policy "Admins manage payment methods"
on public.payment_methods for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop trigger if exists payment_methods_set_updated_at on public.payment_methods;
create trigger payment_methods_set_updated_at before update on public.payment_methods
for each row execute function public.set_updated_at();
