-- This migration is intentionally data-preserving. It adds a secure checkout
-- entry point and removes only unsafe direct customer INSERT policies.

alter table public.orders
add column if not exists checkout_token uuid;

create unique index if not exists orders_checkout_token_idx
on public.orders(checkout_token)
where checkout_token is not null;

create or replace function public.create_checkout_order(
  p_checkout_token uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_country text,
  p_region text,
  p_delivery_address text,
  p_payment_method text,
  p_customer_note text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  existing_order public.orders%rowtype;
  created_order public.orders%rowtype;
  item jsonb;
  item_kind text;
  item_quantity integer;
  item_variant_id uuid;
  item_font_id uuid;
  item_size text;
  item_custom_name text;
  item_custom_number text;
  item_font_slug text;
  item_arm_badge text;
  variant_record record;
  font_record record;
  settings_record record;
  customization_fee integer;
  arm_badge_fee integer;
  item_unit_price integer;
  item_line_total integer;
  calculated_subtotal integer := 0;
  order_number_value text;
begin
  if p_checkout_token is null then
    raise exception 'A checkout token is required.' using errcode = '22023';
  end if;

  select * into existing_order
  from public.orders
  where checkout_token = p_checkout_token;

  if found then
    if existing_order.customer_id is distinct from caller_id then
      raise exception 'This checkout token is already in use.' using errcode = '42501';
    end if;
    return jsonb_build_object('id', existing_order.id, 'order_number', existing_order.order_number);
  end if;

  if nullif(btrim(p_customer_name), '') is null or char_length(btrim(p_customer_name)) > 120 then
    raise exception 'Enter a valid customer name.' using errcode = '22023';
  end if;
  if nullif(btrim(p_customer_phone), '') is null or char_length(btrim(p_customer_phone)) > 40 then
    raise exception 'Enter a valid phone number.' using errcode = '22023';
  end if;
  if p_customer_email is not null and char_length(btrim(p_customer_email)) > 254 then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
  if nullif(btrim(p_country), '') is null or char_length(btrim(p_country)) > 100 then
    raise exception 'Enter a valid country.' using errcode = '22023';
  end if;
  if nullif(btrim(p_region), '') is null or char_length(btrim(p_region)) > 120 then
    raise exception 'Enter a valid region.' using errcode = '22023';
  end if;
  if nullif(btrim(p_delivery_address), '') is null or char_length(btrim(p_delivery_address)) > 500 then
    raise exception 'Enter a valid delivery address.' using errcode = '22023';
  end if;
  if p_customer_note is not null and char_length(btrim(p_customer_note)) > 1000 then
    raise exception 'The customer note is too long.' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'The order must contain between 1 and 50 items.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.payment_methods
    where slug = p_payment_method and is_active
  ) then
    raise exception 'Choose an active payment method.' using errcode = '22023';
  end if;

  select customization_price, arm_badge_price
  into settings_record
  from public.commerce_settings
  where id = true;

  if not found then
    raise exception 'Commerce settings are not configured.' using errcode = '55000';
  end if;

  -- Calculate every price from trusted catalog rows before creating anything.
  for item in select value from jsonb_array_elements(p_items)
  loop
    item_kind := item ->> 'kind';
    begin
      item_quantity := (item ->> 'quantity')::integer;
    exception when others then
      raise exception 'Every item needs a valid quantity.' using errcode = '22023';
    end;
    if item_quantity is null or item_quantity < 1 or item_quantity > 10 then
      raise exception 'Item quantity must be between 1 and 10.' using errcode = '22023';
    end if;

    if item_kind = 'font' then
      begin
        item_font_id := (item ->> 'font_id')::uuid;
      exception when others then
        raise exception 'Invalid font selection.' using errcode = '22023';
      end;
      select id, name, slug, price into font_record
      from public.fonts where id = item_font_id;
      if not found then
        raise exception 'A selected font is no longer available.' using errcode = 'P0001';
      end if;
      calculated_subtotal := calculated_subtotal + (font_record.price * item_quantity);
    elsif item_kind = 'jersey' then
      begin
        item_variant_id := (item ->> 'variant_id')::uuid;
      exception when others then
        raise exception 'Invalid jersey selection.' using errcode = '22023';
      end;
      item_size := nullif(btrim(item ->> 'size'), '');
      item_custom_name := nullif(btrim(item ->> 'custom_name'), '');
      item_custom_number := nullif(btrim(item ->> 'custom_number'), '');
      item_font_slug := nullif(btrim(item ->> 'font_slug'), '');
      item_arm_badge := nullif(btrim(item ->> 'arm_badge'), '');

      if item_size is null or char_length(item_size) > 30
        or coalesce(char_length(item_custom_name), 0) > 30
        or coalesce(char_length(item_custom_number), 0) > 10
        or coalesce(char_length(item_font_slug), 0) > 120
        or coalesce(char_length(item_arm_badge), 0) > 20 then
        raise exception 'A jersey option is invalid.' using errcode = '22023';
      end if;
      if item_arm_badge is not null and item_arm_badge not in ('ucl', 'epl') then
        raise exception 'Invalid arm badge.' using errcode = '22023';
      end if;
      if item_font_slug is not null and not exists (select 1 from public.fonts where slug = item_font_slug) then
        raise exception 'A selected print font is no longer available.' using errcode = 'P0001';
      end if;

      select
        variants.id,
        variants.product_id,
        variants.name as variant_name,
        variants.price,
        products.name as product_name
      into variant_record
      from public.product_variants as variants
      join public.products as products on products.id = variants.product_id
      where variants.id = item_variant_id
        and variants.available
        and products.status = 'active';
      if not found then
        raise exception 'A selected jersey is no longer available.' using errcode = 'P0001';
      end if;
      if not exists (
        select 1 from public.inventory
        where variant_id = item_variant_id
          and size = item_size
          and is_active
          and quantity - reserved >= item_quantity
      ) then
        raise exception 'Insufficient stock for selected item.' using errcode = 'P0001';
      end if;

      customization_fee := case when item_custom_name is not null or item_custom_number is not null
        then settings_record.customization_price else 0 end;
      arm_badge_fee := case when item_arm_badge is not null then settings_record.arm_badge_price else 0 end;
      calculated_subtotal := calculated_subtotal
        + ((variant_record.price + customization_fee + arm_badge_fee) * item_quantity);
    else
      raise exception 'Unsupported checkout item.' using errcode = '22023';
    end if;
  end loop;

  loop
    order_number_value := 'TISA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.orders where order_number = order_number_value);
  end loop;

  insert into public.orders (
    checkout_token, order_number, customer_name, customer_phone, customer_email,
    customer_id, country, region, delivery_address, subtotal, delivery_fee, total,
    status, delivery_status, payment_method, customer_note, admin_note
  ) values (
    p_checkout_token, order_number_value, btrim(p_customer_name), btrim(p_customer_phone),
    nullif(btrim(p_customer_email), ''), caller_id, btrim(p_country), btrim(p_region),
    btrim(p_delivery_address), calculated_subtotal, 0, calculated_subtotal,
    'awaiting_payment', 'pending', p_payment_method, nullif(btrim(p_customer_note), ''), null
  ) returning * into created_order;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_kind := item ->> 'kind';
    item_quantity := (item ->> 'quantity')::integer;

    if item_kind = 'font' then
      item_font_id := (item ->> 'font_id')::uuid;
      select id, name, slug, price into font_record from public.fonts where id = item_font_id;
      insert into public.order_items (
        order_id, product_id, variant_id, product_name, kit_name, size,
        custom_name, custom_number, font_slug, arm_badge,
        customization_fee, arm_badge_fee, quantity, unit_price, line_total
      ) values (
        created_order.id, null, null, font_record.name, 'Digital Font File', 'Font File',
        font_record.name, font_record.slug, font_record.slug, null,
        0, 0, item_quantity, font_record.price, font_record.price * item_quantity
      );
    else
      item_variant_id := (item ->> 'variant_id')::uuid;
      item_size := btrim(item ->> 'size');
      item_custom_name := nullif(btrim(item ->> 'custom_name'), '');
      item_custom_number := nullif(btrim(item ->> 'custom_number'), '');
      item_font_slug := nullif(btrim(item ->> 'font_slug'), '');
      item_arm_badge := nullif(btrim(item ->> 'arm_badge'), '');
      select
        variants.id, variants.product_id, variants.name as variant_name,
        variants.price, products.name as product_name
      into variant_record
      from public.product_variants as variants
      join public.products as products on products.id = variants.product_id
      where variants.id = item_variant_id;
      customization_fee := case when item_custom_name is not null or item_custom_number is not null
        then settings_record.customization_price else 0 end;
      arm_badge_fee := case when item_arm_badge is not null then settings_record.arm_badge_price else 0 end;
      item_unit_price := variant_record.price;
      item_line_total := (item_unit_price + customization_fee + arm_badge_fee) * item_quantity;

      insert into public.order_items (
        order_id, product_id, variant_id, product_name, kit_name, size,
        custom_name, custom_number, font_slug, arm_badge,
        customization_fee, arm_badge_fee, quantity, unit_price, line_total
      ) values (
        created_order.id, variant_record.product_id, variant_record.id,
        variant_record.product_name, variant_record.variant_name, item_size,
        item_custom_name, item_custom_number, item_font_slug, item_arm_badge,
        customization_fee, arm_badge_fee, item_quantity, item_unit_price, item_line_total
      );
    end if;
  end loop;

  insert into public.order_status_history (order_id, from_status, to_status, note)
  values (
    created_order.id,
    null,
    'awaiting_payment',
    'Order request submitted with ' || p_payment_method || ' selected.'
  );

  return jsonb_build_object('id', created_order.id, 'order_number', created_order.order_number);
end;
$$;

revoke all on function public.create_checkout_order(uuid, text, text, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.create_checkout_order(uuid, text, text, text, text, text, text, text, text, jsonb) to anon, authenticated;

drop policy if exists "Customers create checkout orders" on public.orders;
drop policy if exists "Customers create checkout order items" on public.order_items;
drop policy if exists "Customers create initial order history" on public.order_status_history;
drop policy if exists "Customers create payment references" on public.payment_proofs;

revoke insert on public.orders, public.order_items, public.order_status_history, public.payment_proofs from anon;
