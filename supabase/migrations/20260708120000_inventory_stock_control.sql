alter table public.inventory
add column if not exists is_active boolean not null default true;

alter table public.order_items
add column if not exists stock_variant_id uuid references public.product_variants(id) on delete set null,
add column if not exists stock_size text,
add column if not exists stock_quantity integer not null default 0 check (stock_quantity >= 0);

create index if not exists inventory_variant_size_active_idx
on public.inventory(variant_id, size, is_active);

create index if not exists order_items_stock_variant_id_idx
on public.order_items(stock_variant_id);

create or replace function private.order_status_uses_stock(p_status public.order_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status not in ('cancelled'::public.order_status, 'payment_rejected'::public.order_status);
$$;

create or replace function private.order_uses_stock(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select private.order_status_uses_stock(status)
    from public.orders
    where id = p_order_id
  ), false);
$$;

create or replace function private.apply_inventory_delta(
  p_variant_id uuid,
  p_stock_size text,
  p_delta integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_quantity integer;
begin
  if p_variant_id is null or nullif(btrim(p_stock_size), '') is null or p_delta = 0 then
    return;
  end if;

  if p_delta < 0 then
    update public.inventory
    set
      quantity = quantity + p_delta,
      is_active = true
    where inventory.variant_id = p_variant_id
      and inventory.size = p_stock_size
      and inventory.is_active
      and inventory.quantity + p_delta >= 0
      and inventory.quantity + p_delta >= inventory.reserved
    returning quantity into updated_quantity;

    if not found then
      raise exception 'Insufficient stock for selected item.'
        using errcode = 'P0001';
    end if;

    return;
  end if;

  insert into public.inventory (variant_id, size, quantity, reserved, is_active)
  values (p_variant_id, p_stock_size, p_delta, 0, true)
  on conflict (variant_id, size) do update
  set
    quantity = public.inventory.quantity + excluded.quantity,
    is_active = true;
end;
$$;

create or replace function private.sync_order_item_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_order_uses_stock boolean;
  new_order_uses_stock boolean;
  new_stock_variant_id uuid;
  new_stock_size text;
  new_stock_quantity integer;
  stock_fields_changed boolean;
begin
  if tg_op = 'DELETE' then
    old_order_uses_stock := private.order_uses_stock(old.order_id);

    if old_order_uses_stock and old.stock_quantity > 0 then
      perform private.apply_inventory_delta(old.stock_variant_id, old.stock_size, old.stock_quantity);
    end if;

    return old;
  end if;

  new_stock_variant_id := new.variant_id;
  new_stock_size := nullif(btrim(new.size), '');
  new_stock_quantity := case
    when new_stock_variant_id is not null
      and new_stock_size is not null
      and lower(new_stock_size) <> 'font file'
      and new.quantity > 0
      then new.quantity
    else 0
  end;

  if tg_op = 'UPDATE' then
    stock_fields_changed :=
      old.product_id is distinct from new.product_id
      or old.variant_id is distinct from new.variant_id
      or old.size is distinct from new.size
      or old.quantity is distinct from new.quantity;

    if old.stock_quantity = 0 and not stock_fields_changed then
      new.stock_variant_id := old.stock_variant_id;
      new.stock_size := old.stock_size;
      new.stock_quantity := old.stock_quantity;
      return new;
    end if;

    old_order_uses_stock := private.order_uses_stock(old.order_id);
    new_order_uses_stock := private.order_uses_stock(new.order_id);

    if old_order_uses_stock and old.stock_quantity > 0 then
      perform private.apply_inventory_delta(old.stock_variant_id, old.stock_size, old.stock_quantity);
    end if;
  else
    new_order_uses_stock := private.order_uses_stock(new.order_id);
  end if;

  new.stock_variant_id := case when new_stock_quantity > 0 then new_stock_variant_id else null end;
  new.stock_size := case when new_stock_quantity > 0 then new_stock_size else null end;
  new.stock_quantity := new_stock_quantity;

  if new_order_uses_stock and new.stock_quantity > 0 then
    perform private.apply_inventory_delta(new.stock_variant_id, new.stock_size, -new.stock_quantity);
  end if;

  return new;
end;
$$;

drop trigger if exists order_items_sync_stock on public.order_items;
create trigger order_items_sync_stock
before insert or update or delete on public.order_items
for each row execute function private.sync_order_item_stock();

create or replace function private.sync_order_status_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  old_uses_stock boolean;
  new_uses_stock boolean;
begin
  old_uses_stock := private.order_status_uses_stock(old.status);
  new_uses_stock := private.order_status_uses_stock(new.status);

  if old_uses_stock = new_uses_stock then
    return new;
  end if;

  for item in
    select stock_variant_id, stock_size, stock_quantity
    from public.order_items
    where order_id = new.id
      and stock_quantity > 0
  loop
    if old_uses_stock and not new_uses_stock then
      perform private.apply_inventory_delta(item.stock_variant_id, item.stock_size, item.stock_quantity);
    elsif not old_uses_stock and new_uses_stock then
      perform private.apply_inventory_delta(item.stock_variant_id, item.stock_size, -item.stock_quantity);
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists orders_sync_status_stock on public.orders;
create trigger orders_sync_status_stock
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function private.sync_order_status_stock();
