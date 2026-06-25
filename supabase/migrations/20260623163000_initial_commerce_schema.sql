create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'staff');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.kit_type as enum ('home', 'away', 'third');
create type public.order_status as enum (
  'awaiting_payment',
  'verification_pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'payment_rejected'
);
create type public.payment_provider as enum ('kpay', 'wave');
create type public.payment_status as enum ('pending', 'verified', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  team text not null,
  category text not null,
  collection text,
  description text,
  base_price integer not null check (base_price >= 0),
  season text,
  fabric text,
  weight_gsm integer check (weight_gsm > 0),
  breathability smallint check (breathability between 0 and 100),
  durability smallint check (durability between 0 and 100),
  moisture_wicking smallint check (moisture_wicking between 0 and 100),
  accent_color text,
  country_colors text[] not null default '{}',
  featured boolean not null default false,
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  kit public.kit_type not null,
  name text not null,
  sku text unique,
  price integer not null check (price >= 0),
  image_front_path text,
  image_back_path text,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, kit)
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  size text not null,
  quantity integer not null default 0 check (quantity >= 0),
  reserved integer not null default 0 check (reserved >= 0 and reserved <= quantity),
  updated_at timestamptz not null default now(),
  unique (variant_id, size)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  region text not null,
  township text not null,
  delivery_address text not null,
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  total integer not null check (total >= 0),
  status public.order_status not null default 'awaiting_payment',
  customer_note text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  kit_name text not null,
  size text not null,
  custom_name text,
  custom_number text,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  line_total integer not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider public.payment_provider not null,
  transaction_id text not null,
  amount integer not null check (amount >= 0),
  storage_path text not null unique,
  file_hash text,
  status public.payment_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  unique (provider, transaction_id)
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  note text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index product_variants_product_id_idx on public.product_variants(product_id);
create index inventory_variant_id_idx on public.inventory(variant_id);
create index orders_status_created_at_idx on public.orders(status, created_at desc);
create index order_items_order_id_idx on public.order_items(order_id);
create index payment_proofs_order_id_idx on public.payment_proofs(order_id);
create index payment_proofs_status_idx on public.payment_proofs(status);
create index order_status_history_order_id_idx on public.order_status_history(order_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants
for each row execute function public.set_updated_at();
create trigger inventory_set_updated_at before update on public.inventory
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

grant execute on function private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.order_status_history enable row level security;

grant select on public.products, public.product_variants, public.inventory to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.products, public.product_variants,
  public.inventory, public.orders, public.order_items, public.payment_proofs,
  public.order_status_history to authenticated;

create policy "Public can view active products"
on public.products for select
to anon, authenticated
using (status = 'active');

create policy "Public can view available variants"
on public.product_variants for select
to anon, authenticated
using (
  (available and exists (
    select 1 from public.products
    where products.id = product_variants.product_id
      and products.status = 'active'
  ))
);

create policy "Public can view inventory"
on public.inventory for select
to anon, authenticated
using (
  exists (
    select 1
    from public.product_variants
    join public.products on products.id = product_variants.product_id
    where product_variants.id = inventory.variant_id
      and product_variants.available
      and products.status = 'active'
  )
);

create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or private.is_admin());

create policy "Admins manage profiles"
on public.profiles for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins manage products"
on public.products for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins manage variants"
on public.product_variants for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins manage inventory"
on public.inventory for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins manage orders"
on public.orders for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins manage order items"
on public.order_items for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins manage payment proofs"
on public.payment_proofs for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins manage order history"
on public.order_status_history for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Admins upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and private.is_admin());

create policy "Admins update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and private.is_admin())
with check (bucket_id = 'product-images' and private.is_admin());

create policy "Admins delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and private.is_admin());

create policy "Admins view payment proofs"
on storage.objects for select
to authenticated
using (bucket_id = 'payment-proofs' and private.is_admin());

create policy "Admins manage payment proofs"
on storage.objects for all
to authenticated
using (bucket_id = 'payment-proofs' and private.is_admin())
with check (bucket_id = 'payment-proofs' and private.is_admin());
