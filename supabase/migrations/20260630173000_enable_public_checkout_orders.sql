grant insert on public.orders, public.order_items, public.payment_proofs, public.order_status_history to anon, authenticated;

drop policy if exists "Customers create checkout orders" on public.orders;
create policy "Customers create checkout orders"
on public.orders for insert
to anon, authenticated
with check (
  status = 'verification_pending'::public.order_status
  and delivery_status = 'pending'::public.delivery_status
  and delivery_fee >= 0
  and total >= subtotal
);

drop policy if exists "Customers create checkout order items" on public.order_items;
create policy "Customers create checkout order items"
on public.order_items for insert
to anon, authenticated
with check (
  quantity > 0
  and unit_price >= 0
  and line_total >= 0
);

drop policy if exists "Customers create payment references" on public.payment_proofs;
create policy "Customers create payment references"
on public.payment_proofs for insert
to anon, authenticated
with check (
  status = 'pending'::public.payment_status
  and amount >= 0
  and storage_path like 'manual/%'
);

drop policy if exists "Customers create initial order history" on public.order_status_history;
create policy "Customers create initial order history"
on public.order_status_history for insert
to anon, authenticated
with check (
  from_status is null
  and to_status = 'verification_pending'::public.order_status
);
