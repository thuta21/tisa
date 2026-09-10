-- A clean export identifies every target with a stable variant ID. Its display
-- name is intentionally generic (for example, "Home Player Version") and must
-- not become a source alias shared by unrelated variants.
create or replace function public.commit_inventory_import(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare batch public.inventory_imports%rowtype; item jsonb; pid uuid; vid uuid; r public.inventory%rowtype; changes jsonb:='[]'; n integer:=0; created_products integer:=0;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
  select * into batch from public.inventory_imports where id=p_id for update;
  if not found then raise exception 'Import not found';end if;
  if batch.status='committed' then return batch.result;end if;
  if batch.status<>'preview' then raise exception 'Import is not a preview';end if;
  perform pg_advisory_xact_lock(hashtextextended(batch.source_hash,0));
  if exists(select 1 from public.inventory_imports where source_hash=batch.source_hash and status='committed') then raise exception 'Workbook already imported' using errcode='40001';end if;
  if jsonb_typeof(batch.payload->'rows')<>'array' or jsonb_array_length(batch.payload->'rows') not between 1 and 5000 then raise exception 'Invalid import rows';end if;
  perform set_config('app.stock_import',p_id::text,true);
  perform set_config('app.stock_reason','Stock Balance import: '||batch.file_name,true);
  perform set_config('app.stock_order','',true);
  perform id from public.inventory where id in (select (value->>'inventoryId')::uuid from jsonb_array_elements(batch.payload->'rows') where value->>'inventoryId' is not null) order by id for update;
  for item in select value from jsonb_array_elements(batch.payload->'rows') loop
    if item->>'quantity' is null or (item->>'quantity')::numeric<>trunc((item->>'quantity')::numeric) or (item->>'quantity')::numeric<0
      or nullif(item->>'size','') is null or item->>'expectedVersion' is null then raise exception 'Invalid inventory quantity/size/version';end if;
    pid:=null;vid:=null;
    if item->>'variantId' is not null then
      select id,product_id into vid,pid from public.product_variants where id=(item->>'variantId')::uuid;
      if not found then raise exception 'Variant no longer exists' using errcode='40001';end if;
    else
      if item->>'productId' is not null then
        select id into pid from public.products where id=(item->>'productId')::uuid;
        if not found then raise exception 'Product no longer exists' using errcode='40001';end if;
      else
        perform pg_advisory_xact_lock(hashtextextended(item->>'productSlug',1));
        select id into pid from public.products where slug=item->>'productSlug';
        if pid is not null and not exists(select 1 from jsonb_array_elements(changes) x where x->>'productId'=pid::text and (x->>'createdProduct')::boolean) then
          raise exception 'Catalog changed. Refresh the import preview.' using errcode='40001';
        end if;
        if pid is null then
          insert into public.products(slug,name,team,category,season,sleeve,status,base_price)
          values(item->>'productSlug',initcap(item->>'team')||case when item->>'sleeve'='long' then ' Longsleeve Jersey' else ' Jersey' end,item->>'team','Unassigned',item->>'season',item->>'sleeve','draft',0) returning id into pid;
          created_products:=created_products+1;
        end if;
      end if;
      select id into vid from public.product_variants where product_id=pid and kit=(item->>'kit')::public.kit_type;
      if vid is not null and not exists(select 1 from jsonb_array_elements(changes) x where x->>'variantId'=vid::text) then
        raise exception 'Variant created since preview. Refresh.' using errcode='40001';
      end if;
      if vid is null then
        insert into public.product_variants(product_id,kit,name,price,available)
        values(pid,(item->>'kit')::public.kit_type,item->>'name',0,false) returning id into vid;
      end if;
    end if;
    select * into r from public.inventory where variant_id=vid and size=item->>'size' for update;
    if found then
      if r.version<>(item->>'expectedVersion')::bigint or (item->>'inventoryId' is not null and r.id<>(item->>'inventoryId')::uuid) then raise exception 'Stock changed since preview. Refresh.' using errcode='40001';end if;
      if (item->>'quantity')::integer<r.reserved then raise exception 'Balance below reserved quantity';end if;
      update public.inventory set quantity=(item->>'quantity')::integer where id=r.id returning * into r;
    else
      if (item->>'expectedVersion')::bigint<>0 or item->>'inventoryId' is not null then raise exception 'Inventory changed since preview' using errcode='40001';end if;
      insert into public.inventory(variant_id,size,quantity) values(vid,item->>'size',(item->>'quantity')::integer) returning * into r;
    end if;
    if nullif(item->>'sourceAlias','') is not null then
      insert into public.inventory_aliases(source_name,variant_id) values(lower(btrim(item->>'sourceAlias')),vid) on conflict(source_name) do nothing;
      if exists(select 1 from public.inventory_aliases where source_name=lower(btrim(item->>'sourceAlias')) and variant_id<>vid) then raise exception 'Source alias collision';end if;
    end if;
    changes:=changes||jsonb_build_array(jsonb_build_object('inventoryId',r.id,'variantId',vid,'productId',pid,'createdProduct',item->>'productId' is null and item->>'variantId' is null,'before',(item->>'before')::integer,'after',r.quantity,'version',r.version,'sourceRow',item->>'row','sourceName',item->>'name','size',r.size));
    n:=n+1;
  end loop;
  update public.inventory_imports set status='committed',committed_at=now(),result=jsonb_build_object('count',n,'createdProducts',created_products,'changes',changes) where id=p_id returning result into changes;
  return changes;
end $$;

revoke all on function public.commit_inventory_import(uuid) from public;
grant execute on function public.commit_inventory_import(uuid) to authenticated;
