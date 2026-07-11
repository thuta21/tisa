alter table public.orders
add column if not exists customer_id uuid references public.profiles(id) on delete set null;

create index if not exists orders_customer_id_created_at_idx
on public.orders(customer_id, created_at desc);

drop policy if exists "Customers create checkout orders" on public.orders;
create policy "Customers create checkout orders"
on public.orders for insert
to anon, authenticated
with check (
  status in ('awaiting_payment'::public.order_status, 'verification_pending'::public.order_status)
  and delivery_status = 'pending'::public.delivery_status
  and delivery_fee >= 0
  and total >= subtotal
  and (customer_id is null or customer_id = (select auth.uid()))
);

create policy "Customers view their own orders"
on public.orders for select
to authenticated
using (customer_id = (select auth.uid()));

create policy "Customers view items for their own orders"
on public.order_items for select
to authenticated
using (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.customer_id = (select auth.uid())));

create policy "Customers view history for their own orders"
on public.order_status_history for select
to authenticated
using (exists (select 1 from public.orders where orders.id = order_status_history.order_id and orders.customer_id = (select auth.uid())));
