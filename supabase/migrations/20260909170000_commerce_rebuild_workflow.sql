-- A guarded rebuild keeps reference data, profiles, fonts and storage objects while
-- replacing the four transactional domains in a controlled order.
create or replace function private.validate_product_sleeve()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sleeve not in ('short', 'long') then
    raise exception 'Product sleeve must be short or long.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger validate_product_sleeve
before insert or update of sleeve on public.products
for each row execute function private.validate_product_sleeve();

create table public.commerce_rebuilds (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  status text not null default 'backed_up' check (status in ('backed_up','cleaned','orders_restored')),
  backup_sha256 text not null,
  backup jsonb not null,
  source_counts jsonb not null,
  created_at timestamptz not null default now(),
  cleaned_at timestamptz,
  restored_at timestamptz
);

alter table public.commerce_rebuilds enable row level security;
create policy "Admins view commerce rebuilds" on public.commerce_rebuilds
for select to authenticated using (private.is_admin());
grant select on public.commerce_rebuilds to authenticated;

create or replace function private.build_order_backup()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'format', 'tisa-order-records-backup',
    'version', 2,
    'exportedAt', clock_timestamp(),
    'notes', jsonb_build_array(
      'Payment proof files are stored separately; this backup contains their database records and storage paths.',
      'Authentication users are managed by Supabase Auth and are not included.',
      'Catalog references are included so restored order items can be remapped after a clean product import.'
    ),
    'counts', jsonb_build_object(
      'orders', (select count(*) from public.orders),
      'orderItems', (select count(*) from public.order_items),
      'paymentProofs', (select count(*) from public.payment_proofs),
      'statusHistory', (select count(*) from public.order_status_history),
      'paymentMethods', (select count(*) from public.payment_methods)
    ),
    'orders', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at, r.id) from public.orders r), '[]'::jsonb),
    'orderItems', coalesce((select jsonb_agg(to_jsonb(r) order by r.order_id, r.created_at, r.id) from public.order_items r), '[]'::jsonb),
    'paymentProofs', coalesce((select jsonb_agg(to_jsonb(r) order by r.order_id, r.created_at, r.id) from public.payment_proofs r), '[]'::jsonb),
    'statusHistory', coalesce((select jsonb_agg(to_jsonb(r) order by r.order_id, r.created_at, r.id) from public.order_status_history r), '[]'::jsonb),
    'paymentMethods', coalesce((select jsonb_agg(to_jsonb(r) order by r.sort_order, r.id) from public.payment_methods r), '[]'::jsonb),
    'catalogReferences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'oldProductId', p.id,
        'productSlug', p.slug,
        'sleeve', p.sleeve,
        'oldVariantId', v.id,
        'sku', v.sku,
        'kit', v.kit
      ) order by p.slug, p.sleeve, v.kit)
      from public.product_variants v
      join public.products p on p.id = v.product_id
      where exists (
        select 1 from public.order_items oi
        where oi.variant_id = v.id or oi.stock_variant_id = v.id or oi.product_id = p.id
      )
    ), '[]'::jsonb)
  );
$$;

create or replace function public.export_order_records()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  return private.build_order_backup();
end;
$$;

create or replace function public.prepare_commerce_rebuild()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
  digest text;
  rebuild_id uuid;
begin
  if not private.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  snapshot := private.build_order_backup();
  digest := encode(public.digest(convert_to(snapshot::text, 'UTF8'), 'sha256'), 'hex');
  insert into public.commerce_rebuilds(backup_sha256, backup, source_counts)
  values(digest, snapshot, snapshot->'counts') returning id into rebuild_id;
  return jsonb_build_object('id', rebuild_id, 'sha256', digest, 'backup', snapshot);
end;
$$;

-- Stock synchronization must be bypassed only inside the guarded rebuild transaction.
drop trigger if exists order_items_sync_stock on public.order_items;
create trigger order_items_sync_stock
before insert or update or delete on public.order_items
for each row
when (current_setting('app.commerce_rebuild', true) is distinct from 'true')
execute function private.sync_order_item_stock();

drop trigger if exists orders_sync_status_stock on public.orders;
create trigger orders_sync_status_stock
after update of status on public.orders
for each row
when (
  old.status is distinct from new.status
  and current_setting('app.commerce_rebuild', true) is distinct from 'true'
)
execute function private.sync_order_status_stock();

create or replace function public.clean_commerce_data(p_rebuild_id uuid, p_backup_sha256 text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rebuild public.commerce_rebuilds%rowtype;
  current_counts jsonb;
begin
  if not private.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  select * into rebuild from public.commerce_rebuilds where id = p_rebuild_id for update;
  if not found or rebuild.status <> 'backed_up' or rebuild.backup_sha256 <> p_backup_sha256 then
    raise exception 'A matching order backup is required before cleaning.' using errcode = '22023';
  end if;

  current_counts := jsonb_build_object(
    'orders', (select count(*) from public.orders),
    'orderItems', (select count(*) from public.order_items),
    'paymentProofs', (select count(*) from public.payment_proofs),
    'statusHistory', (select count(*) from public.order_status_history),
    'paymentMethods', (select count(*) from public.payment_methods)
  );
  if current_counts <> rebuild.source_counts then
    raise exception 'Order data changed after backup. Create a new backup before cleaning.' using errcode = '40001';
  end if;

  perform set_config('app.commerce_rebuild', 'true', true);
  delete from public.order_status_history;
  delete from public.payment_proofs;
  delete from public.order_items;
  delete from public.orders;
  delete from public.knowledge_chunks;
  delete from public.knowledge_jobs;
  delete from public.knowledge_documents;
  delete from public.inventory_movements;
  delete from public.inventory_operations;
  delete from public.inventory_aliases;
  delete from public.inventory_imports;
  delete from public.inventory;
  delete from public.product_variants;
  delete from public.products;
  delete from public.commerce_rebuilds where id <> rebuild.id;
  delete from public.profiles where id <> auth.uid();
  delete from auth.users where id <> auth.uid();

  update public.commerce_rebuilds set status = 'cleaned', cleaned_at = now()
  where id = rebuild.id;
  return jsonb_build_object('id', rebuild.id, 'status', 'cleaned');
end;
$$;

create or replace function public.restore_rebuild_orders(p_rebuild_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rebuild public.commerce_rebuilds%rowtype;
  value jsonb;
  reference jsonb;
  order_row public.orders%rowtype;
  item_row public.order_items%rowtype;
  proof_row public.payment_proofs%rowtype;
  history_row public.order_status_history%rowtype;
  method_row public.payment_methods%rowtype;
  mapped_variant uuid;
  mapped_product uuid;
  restored_orders integer := 0;
  restored_items integer := 0;
  unmapped_items integer := 0;
begin
  if not private.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  select * into rebuild from public.commerce_rebuilds where id = p_rebuild_id for update;
  if not found or rebuild.status <> 'cleaned' then
    raise exception 'The rebuild must be cleaned before orders can be restored.' using errcode = '22023';
  end if;
  if not exists(select 1 from public.products) or not exists(select 1 from public.inventory) then
    raise exception 'Import products and inventory before restoring orders.' using errcode = '22023';
  end if;
  if exists(select 1 from public.orders) then
    raise exception 'Orders already exist. Restore requires an empty order domain.' using errcode = '40001';
  end if;

  perform set_config('app.commerce_rebuild', 'true', true);
  for value in select entry from jsonb_array_elements(rebuild.backup->'paymentMethods') as entries(entry) loop
    select * into method_row from jsonb_populate_record(null::public.payment_methods, value);
    insert into public.payment_methods(id, name, slug, is_active, sort_order, created_at, updated_at)
    values(method_row.id, method_row.name, method_row.slug, method_row.is_active, method_row.sort_order, method_row.created_at, method_row.updated_at)
    on conflict(slug) do update set
      name = excluded.name,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order;
  end loop;
  for value in select entry from jsonb_array_elements(rebuild.backup->'orders') as entries(entry) loop
    select * into order_row from jsonb_populate_record(null::public.orders, value);
    if order_row.customer_id is not null and not exists(select 1 from public.profiles where id = order_row.customer_id) then
      order_row.customer_id := null;
    end if;
    insert into public.orders select order_row.*;
    restored_orders := restored_orders + 1;
  end loop;

  for value in select entry from jsonb_array_elements(rebuild.backup->'orderItems') as entries(entry) loop
    select * into item_row from jsonb_populate_record(null::public.order_items, value);
    mapped_variant := null;
    mapped_product := null;
    if item_row.variant_id is not null then
      select r into reference from jsonb_array_elements(rebuild.backup->'catalogReferences') r
      where r->>'oldVariantId' = item_row.variant_id::text limit 1;
      select v.id, v.product_id into mapped_variant, mapped_product
      from public.product_variants v join public.products p on p.id = v.product_id
      where v.id = item_row.variant_id
         or (nullif(reference->>'sku','') is not null and lower(v.sku) = lower(reference->>'sku'))
         or (p.slug = reference->>'productSlug' and p.sleeve = reference->>'sleeve' and v.kit::text = reference->>'kit')
      order by (v.id = item_row.variant_id) desc,
               (nullif(reference->>'sku','') is not null and lower(v.sku) = lower(reference->>'sku')) desc
      limit 1;
    end if;
    item_row.variant_id := mapped_variant;
    item_row.product_id := mapped_product;
    if item_row.stock_variant_id is not null then
      item_row.stock_variant_id := mapped_variant;
      if mapped_variant is null then
        item_row.stock_size := null;
        item_row.stock_quantity := 0;
      end if;
    end if;
    if value->>'variant_id' is not null and mapped_variant is null then
      unmapped_items := unmapped_items + 1;
    end if;
    insert into public.order_items select item_row.*;
    restored_items := restored_items + 1;
  end loop;

  for value in select entry from jsonb_array_elements(rebuild.backup->'paymentProofs') as entries(entry) loop
    select * into proof_row from jsonb_populate_record(null::public.payment_proofs, value);
    if proof_row.reviewed_by is not null and not exists(select 1 from public.profiles where id = proof_row.reviewed_by) then
      proof_row.reviewed_by := null;
    end if;
    insert into public.payment_proofs select proof_row.*;
  end loop;
  for value in select entry from jsonb_array_elements(rebuild.backup->'statusHistory') as entries(entry) loop
    select * into history_row from jsonb_populate_record(null::public.order_status_history, value);
    if history_row.changed_by is not null and not exists(select 1 from public.profiles where id = history_row.changed_by) then
      history_row.changed_by := null;
    end if;
    insert into public.order_status_history select history_row.*;
  end loop;

  update public.commerce_rebuilds set status = 'orders_restored', restored_at = now()
  where id = rebuild.id;
  return jsonb_build_object(
    'status', 'orders_restored',
    'orders', restored_orders,
    'items', restored_items,
    'unmappedItems', unmapped_items
  );
end;
$$;

revoke all on function public.prepare_commerce_rebuild() from public;
revoke all on function public.clean_commerce_data(uuid, text) from public;
revoke all on function public.restore_rebuild_orders(uuid) from public;
grant execute on function public.prepare_commerce_rebuild() to authenticated;
grant execute on function public.clean_commerce_data(uuid, text) to authenticated;
grant execute on function public.restore_rebuild_orders(uuid) to authenticated;
