create or replace function public.save_admin_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.orders%rowtype;
  previous_status public.order_status;
  item jsonb;
  item_id uuid;
  item_variant uuid;
  item_product uuid;
  item_quantity integer;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'Order requires 1 to 100 items.' using errcode = '22023';
  end if;
  if nullif(btrim(p_order->>'customer_name'), '') is null
     or nullif(btrim(p_order->>'customer_phone'), '') is null
     or nullif(btrim(p_order->>'country'), '') is null
     or nullif(btrim(p_order->>'region'), '') is null
     or nullif(btrim(p_order->>'delivery_address'), '') is null then
    raise exception 'Customer and delivery fields are required.' using errcode = '22023';
  end if;
  if not exists(select 1 from public.payment_methods where slug = p_order->>'payment_method') then
    raise exception 'Unknown payment method.' using errcode = '22023';
  end if;
  if (p_order->>'subtotal')::numeric < 0 or (p_order->>'delivery_fee')::numeric < 0
     or (p_order->>'total')::numeric <> (p_order->>'subtotal')::numeric + (p_order->>'delivery_fee')::numeric then
    raise exception 'Invalid order totals.' using errcode = '22023';
  end if;

  if nullif(p_order->>'id', '') is null then
    insert into public.orders(
      order_number, customer_name, customer_phone, customer_email, country, region,
      delivery_address, subtotal, delivery_fee, total, status, delivery_status,
      payment_method, customer_note, admin_note
    ) values (
      p_order->>'order_number', btrim(p_order->>'customer_name'), btrim(p_order->>'customer_phone'), nullif(btrim(p_order->>'customer_email'), ''),
      btrim(p_order->>'country'), btrim(p_order->>'region'), btrim(p_order->>'delivery_address'),
      (p_order->>'subtotal')::integer, (p_order->>'delivery_fee')::integer, (p_order->>'total')::integer,
      (p_order->>'status')::public.order_status, (p_order->>'delivery_status')::public.delivery_status,
      p_order->>'payment_method', nullif(btrim(p_order->>'customer_note'), ''), nullif(btrim(p_order->>'admin_note'), '')
    ) returning * into saved;
    insert into public.order_status_history(order_id, from_status, to_status, note)
    values(saved.id, null, saved.status, 'Order created via admin panel');
  else
    select * into saved from public.orders where id = (p_order->>'id')::uuid for update;
    if not found then raise exception 'Order not found.' using errcode = '22023'; end if;
    previous_status := saved.status;
    update public.orders set
      order_number = p_order->>'order_number', customer_name = btrim(p_order->>'customer_name'), customer_phone = btrim(p_order->>'customer_phone'),
      customer_email = nullif(btrim(p_order->>'customer_email'), ''), country = btrim(p_order->>'country'), region = btrim(p_order->>'region'),
      delivery_address = btrim(p_order->>'delivery_address'), subtotal = (p_order->>'subtotal')::integer,
      delivery_fee = (p_order->>'delivery_fee')::integer, total = (p_order->>'total')::integer,
      status = (p_order->>'status')::public.order_status, delivery_status = (p_order->>'delivery_status')::public.delivery_status,
      payment_method = p_order->>'payment_method', customer_note = nullif(btrim(p_order->>'customer_note'), ''),
      admin_note = nullif(btrim(p_order->>'admin_note'), '')
    where id = saved.id returning * into saved;
    if previous_status is distinct from saved.status then
      insert into public.order_status_history(order_id, from_status, to_status, note)
      values(saved.id, previous_status, saved.status, 'Status updated during order edit');
    end if;
    delete from public.order_items where order_id = saved.id;
  end if;

  for item in select entry from jsonb_array_elements(p_items) as entries(entry) loop
    item_id := coalesce(nullif(item->>'id','')::uuid, gen_random_uuid());
    item_variant := nullif(item->>'variant_id','')::uuid;
    item_product := nullif(item->>'product_id','')::uuid;
    item_quantity := (item->>'quantity')::integer;
    if item_quantity < 1 or (item->>'unit_price')::integer < 0 or (item->>'line_total')::integer < 0
       or nullif(btrim(item->>'product_name'), '') is null or nullif(btrim(item->>'size'), '') is null then
      raise exception 'Invalid order item.' using errcode = '22023';
    end if;
    if item_variant is not null and not exists(
      select 1 from public.product_variants where id = item_variant and product_id = item_product
    ) then raise exception 'Order item product and variant do not match.' using errcode = '22023'; end if;
    insert into public.order_items(
      id, order_id, product_id, variant_id, product_name, kit_name, size, custom_name,
      custom_number, font_slug, arm_badge, customization_fee, arm_badge_fee,
      quantity, unit_price, line_total
    ) values (
      item_id, saved.id, item_product, item_variant, btrim(item->>'product_name'), btrim(item->>'kit_name'), btrim(item->>'size'),
      nullif(btrim(item->>'custom_name'), ''), nullif(btrim(item->>'custom_number'), ''), nullif(btrim(item->>'font_slug'), ''),
      nullif(item->>'arm_badge',''), coalesce((item->>'customization_fee')::integer, 0), coalesce((item->>'arm_badge_fee')::integer, 0),
      item_quantity, (item->>'unit_price')::integer, (item->>'line_total')::integer
    );
  end loop;
  return jsonb_build_object('id', saved.id, 'orderNumber', saved.order_number);
end;
$$;

create or replace function public.update_admin_order_status(p_order_id uuid, p_status public.order_status, p_note text default 'Updated from admin panel')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.orders%rowtype; old_status public.order_status;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  select * into r from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.' using errcode = '22023'; end if;
  old_status := r.status;
  if old_status is distinct from p_status then
    update public.orders set status = p_status where id = r.id returning * into r;
    insert into public.order_status_history(order_id, from_status, to_status, note)
    values(r.id, old_status, p_status, left(coalesce(nullif(p_note,''), 'Updated from admin panel'), 1000));
  end if;
  return to_jsonb(r);
end $$;

create or replace function public.update_admin_delivery_status(p_order_id uuid, p_status public.delivery_status)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.orders%rowtype;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  update public.orders set delivery_status = p_status where id = p_order_id returning * into r;
  if not found then raise exception 'Order not found.' using errcode = '22023'; end if;
  return to_jsonb(r);
end $$;

create or replace function public.review_payment_proof(p_proof_id uuid, p_status public.payment_status, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare proof public.payment_proofs%rowtype; order_row public.orders%rowtype; next_status public.order_status;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_status not in ('verified','rejected') then raise exception 'Payment review must be verified or rejected.' using errcode = '22023'; end if;
  select * into proof from public.payment_proofs where id = p_proof_id for update;
  if not found then raise exception 'Payment proof not found.' using errcode = '22023'; end if;
  select * into order_row from public.orders where id = proof.order_id for update;
  next_status := case when p_status = 'verified' then 'paid'::public.order_status else 'payment_rejected'::public.order_status end;
  update public.payment_proofs set status = p_status, reviewed_by = auth.uid(), reviewed_at = now(),
    rejection_reason = case when p_status = 'rejected' then left(coalesce(nullif(p_reason,''), 'Rejected from admin panel'), 1000) else null end
  where id = proof.id;
  if order_row.status is distinct from next_status then
    update public.orders set status = next_status where id = order_row.id;
    insert into public.order_status_history(order_id, from_status, to_status, note)
    values(order_row.id, order_row.status, next_status, case when p_status = 'verified' then 'Updated via payment proof approval' else 'Updated via payment proof rejection' end);
  end if;
  return jsonb_build_object('proofId', proof.id, 'orderId', order_row.id, 'orderStatus', next_status);
end $$;

create or replace function public.delete_admin_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare number text;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  select order_number into number from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.' using errcode = '22023'; end if;
  update public.orders set status = 'cancelled'
  where id = p_order_id and private.order_status_uses_stock(status);
  delete from public.orders where id = p_order_id;
  return jsonb_build_object('id', p_order_id, 'orderNumber', number);
end $$;

revoke all on function public.save_admin_order(jsonb,jsonb) from public;
revoke all on function public.update_admin_order_status(uuid,public.order_status,text) from public;
revoke all on function public.update_admin_delivery_status(uuid,public.delivery_status) from public;
revoke all on function public.review_payment_proof(uuid,public.payment_status,text) from public;
revoke all on function public.delete_admin_order(uuid) from public;
grant execute on function public.save_admin_order(jsonb,jsonb) to authenticated;
grant execute on function public.update_admin_order_status(uuid,public.order_status,text) to authenticated;
grant execute on function public.update_admin_delivery_status(uuid,public.delivery_status) to authenticated;
grant execute on function public.review_payment_proof(uuid,public.payment_status,text) to authenticated;
grant execute on function public.delete_admin_order(uuid) to authenticated;

-- All order-domain mutations now pass through transactional RPCs. Read policies remain unchanged.
revoke insert, update, delete on public.orders, public.order_items, public.order_status_history, public.payment_proofs from authenticated;
