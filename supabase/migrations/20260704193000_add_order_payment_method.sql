do $$
begin
  create type public.order_payment_method as enum ('cod', 'bank_pay');
exception
  when duplicate_object then null;
end
$$;

alter table public.orders
add column if not exists payment_method public.order_payment_method not null default 'cod';

update public.orders
set payment_method = 'bank_pay'::public.order_payment_method
where exists (
  select 1
  from public.payment_proofs
  where payment_proofs.order_id = orders.id
);
