drop policy if exists "Customers create checkout orders" on public.orders;
create policy "Customers create checkout orders"
on public.orders for insert
to anon, authenticated
with check (
  status in ('awaiting_payment'::public.order_status, 'verification_pending'::public.order_status)
  and delivery_status = 'pending'::public.delivery_status
  and delivery_fee >= 0
  and total >= subtotal
);

drop policy if exists "Customers create initial order history" on public.order_status_history;
create policy "Customers create initial order history"
on public.order_status_history for insert
to anon, authenticated
with check (
  from_status is null
  and to_status in ('awaiting_payment'::public.order_status, 'verification_pending'::public.order_status)
);
