-- Additive: never replay historical orders or replace catalog IDs.
alter table public.inventory add column if not exists version bigint not null default 1;
alter table public.products add column if not exists sleeve text not null default 'short'
  check (sleeve in ('short', 'long', 'unknown'));

create table public.inventory_imports (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null default auth.uid() references auth.users(id),
  source_hash text not null,
  file_name text not null,
  payload jsonb not null,
  status text not null default 'preview' check (status in ('preview','committed','reversed')),
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  result jsonb
);
create unique index inventory_import_committed_hash on public.inventory_imports(source_hash) where status = 'committed';
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null,
  variant_id uuid not null,
  size text not null,
  before_quantity integer not null,
  after_quantity integer not null,
  before_reserved integer not null,
  after_reserved integer not null,
  before_active boolean not null,
  after_active boolean not null,
  version bigint not null,
  reason text not null,
  actor_id uuid default auth.uid(),
  order_id uuid,
  import_id uuid references public.inventory_imports(id),
  created_at timestamptz not null default now()
);
create index inventory_movement_history on public.inventory_movements(inventory_id, created_at desc);
create table public.inventory_operations (
  id uuid primary key,
  actor_id uuid not null,
  request jsonb not null,
  result jsonb not null
);
create table public.inventory_aliases (
  source_name text primary key,
  variant_id uuid not null references public.product_variants(id) on delete restrict
);

alter table public.inventory_imports enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_operations enable row level security;
alter table public.inventory_aliases enable row level security;
create policy "Admin import previews" on public.inventory_imports for select to authenticated using (private.is_admin());
create policy "Admin stage imports" on public.inventory_imports for insert to authenticated with check (private.is_admin() and actor_id = auth.uid() and status = 'preview' and result is null and committed_at is null);
create policy "Admin movement history" on public.inventory_movements for select to authenticated using (private.is_admin());
create policy "Admin aliases" on public.inventory_aliases for select to authenticated using (private.is_admin());
grant select, insert on public.inventory_imports to authenticated;
grant select on public.inventory_movements, public.inventory_aliases to authenticated;

create function private.audit_inventory() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if (new.quantity,new.reserved,new.is_active) is not distinct from (old.quantity,old.reserved,old.is_active) then
      new.version := old.version; return new;
    end if;
    new.version := old.version + 1;
  else new.version := 1;
  end if;
  insert into public.inventory_movements(inventory_id,variant_id,size,before_quantity,after_quantity,before_reserved,after_reserved,before_active,after_active,version,reason,order_id,import_id)
  values(new.id,new.variant_id,new.size,case when tg_op='INSERT' then 0 else old.quantity end,new.quantity,
    case when tg_op='INSERT' then 0 else old.reserved end,new.reserved,
    case when tg_op='INSERT' then false else old.is_active end,new.is_active,new.version,
    coalesce(nullif(current_setting('app.stock_reason',true),''),'Inventory change'),
    nullif(current_setting('app.stock_order',true),'')::uuid,
    nullif(current_setting('app.stock_import',true),'')::uuid);
  return new;
end $$;
create trigger inventory_audit before insert or update on public.inventory for each row execute function private.audit_inventory();

create function public.adjust_inventory(p_request jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.inventory%rowtype; op public.inventory_operations%rowtype; q integer; answer jsonb;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if nullif(p_request->>'reason','') is null or length(p_request->>'reason') > 500
     or p_request->>'operation' not in ('set','add','remove') or (p_request->>'quantity')::numeric < 0
     or (p_request->>'quantity')::numeric <> trunc((p_request->>'quantity')::numeric)
     or p_request->>'quantity' is null or p_request->>'expectedVersion' is null or p_request->>'idempotencyKey' is null
  then raise exception 'Invalid stock adjustment' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request->>'idempotencyKey',0));
  select * into op from public.inventory_operations where id=(p_request->>'idempotencyKey')::uuid;
  if found then
    if op.actor_id <> auth.uid() or op.request <> p_request then raise exception 'Idempotency key conflict' using errcode='40001'; end if;
    return op.result;
  end if;
  select * into r from public.inventory where id=(p_request->>'inventoryId')::uuid for update;
  if not found then raise exception 'Inventory not found' using errcode='22023'; end if;
  if r.version <> (p_request->>'expectedVersion')::bigint then raise exception 'Stock changed. Refresh and review the latest quantity.' using errcode='40001'; end if;
  q := case p_request->>'operation' when 'set' then (p_request->>'quantity')::integer
    when 'add' then r.quantity+(p_request->>'quantity')::integer else r.quantity-(p_request->>'quantity')::integer end;
  if q < r.reserved then raise exception 'Quantity cannot be lower than reserved stock' using errcode='22023'; end if;
  perform set_config('app.stock_reason',p_request->>'reason',true);
  update public.inventory set quantity=q where id=r.id returning to_jsonb(inventory.*) into answer;
  insert into public.inventory_operations values((p_request->>'idempotencyKey')::uuid,auth.uid(),p_request,answer);
  return answer;
end $$;
revoke all on function public.adjust_inventory(jsonb) from public;
grant execute on function public.adjust_inventory(jsonb) to authenticated;

-- Guard all direct API writes. Order triggers / security-definer RPCs still own stock writes.
revoke insert, update, delete on public.inventory from authenticated;

create function private.protect_order_catalog() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name = 'products' then
    if exists(select 1 from public.order_items where product_id=old.id) then
      raise exception 'Archive products referenced by orders; deletion is not allowed.';
    end if;
  else
    if exists(select 1 from public.order_items where variant_id=old.id or stock_variant_id=old.id) then
      raise exception 'Disable variants referenced by orders; deletion is not allowed.';
    end if;
  end if;
  return old;
end $$;
create trigger protect_order_product before delete on public.products for each row execute function private.protect_order_catalog();
create trigger protect_order_variant before delete on public.product_variants for each row execute function private.protect_order_catalog();

-- Context runs before existing stock triggers, without duplicating their deduction.
create function private.stock_order_context() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_table_name='orders' then
    perform set_config('app.stock_order',new.id::text,true);
  elsif tg_op='DELETE' then
    perform set_config('app.stock_order',old.order_id::text,true);
  else
    perform set_config('app.stock_order',new.order_id::text,true);
  end if;
  perform set_config('app.stock_reason','Order ' || lower(tg_op),true);
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger aaa_order_stock_context before insert or update or delete on public.order_items for each row execute function private.stock_order_context();
create trigger aaa_order_status_context before update of status on public.orders for each row execute function private.stock_order_context();
