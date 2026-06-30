create type public.delivery_status as enum (
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);

alter table public.orders
add column delivery_status public.delivery_status not null default 'pending';

update public.orders
set delivery_status = case status
  when 'processing' then 'processing'::public.delivery_status
  when 'shipped' then 'shipped'::public.delivery_status
  when 'delivered' then 'delivered'::public.delivery_status
  when 'cancelled' then 'cancelled'::public.delivery_status
  else 'pending'::public.delivery_status
end;
