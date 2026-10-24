-- Keep authenticated/admin data access enforced in Postgres, including direct API calls.
revoke create on schema public from public, anon, authenticated;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table private.customer_request_quotas (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  hits integer not null,
  primary key(user_id, action)
);
alter table private.customer_request_quotas enable row level security;
revoke all on private.customer_request_quotas from public, anon, authenticated;

create function private.take_customer_quota(p_action text, p_limit integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare current_window timestamptz := date_trunc('minute', now()); count_hits integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  insert into private.customer_request_quotas(user_id,action,window_start,hits)
    values(auth.uid(),p_action,current_window,1)
    on conflict(user_id,action) do update set window_start=current_window,
      hits=case when customer_request_quotas.window_start=current_window then least(customer_request_quotas.hits+1,p_limit+1) else 1 end
    returning hits into count_hits;
  return count_hits<=p_limit;
end;
$$;

create function public.consume_whatsapp_order_quota()
returns boolean language sql security definer set search_path='' as $$
  select private.take_customer_quota('whatsapp', 10);
$$;

create or replace function public.update_customer_profile(p_display_name text, p_phone text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if length(trim(coalesce(p_display_name, ''))) not between 2 and 100
     or p_display_name ~ E'[\r\n]'
     or trim(coalesce(p_phone, '')) !~ '^\+?[0-9 ()-]{7,25}$'
     or length(regexp_replace(p_phone, '[^0-9]', '', 'g')) < 7 then
    raise exception 'Enter a valid name and phone number.' using errcode = '22023';
  end if;
  if not private.take_customer_quota('profile', 30) then
    raise exception 'Too many profile updates. Please try again in a minute.' using errcode='P0001';
  end if;
  insert into public.profiles(id, display_name, phone)
    values(auth.uid(), trim(p_display_name), trim(p_phone))
    on conflict(id) do update set display_name = excluded.display_name, phone = excluded.phone;
end;
$$;
revoke all on function public.update_customer_profile(text, text) from public, anon;
grant execute on function public.update_customer_profile(text, text) to authenticated;


-- Size selections now persist without changing quantities or removing stock history.
create or replace function public.save_catalog(p_records jsonb,p_import boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; v jsonb; stock jsonb; p public.products%rowtype; oldp public.products%rowtype; vr public.product_variants%rowtype; inv public.inventory%rowtype; pid uuid; result jsonb:='[]'; fresh boolean;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
  if jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records) not between 1 and 500 then raise exception 'Invalid catalog batch';end if;
  for item in select value from jsonb_array_elements(p_records) loop
    fresh:=nullif(item->>'id','') is null;
    if fresh then
      p:=null;
      p.id:=gen_random_uuid();p.country_colors:='{}';p.status:='draft';p.featured:=false;p.sleeve:='short';
    else
      select * into p from public.products where id=(item->>'id')::uuid for update;
      if not found then raise exception 'Product not found';end if;
      if item->>'expectedUpdatedAt' is null or p.updated_at<>(item->>'expectedUpdatedAt')::timestamptz then raise exception 'Product changed since preview. Reload.' using errcode='40001';end if;
    end if;
    oldp:=p;
    -- Explicit allowlist: callers cannot replace IDs, timestamps or stock.
    select * into p from jsonb_populate_record(p,(item->'metadata') - array['id','created_at','updated_at']);
    p.id:=oldp.id;
    if nullif(btrim(p.name),'') is null or nullif(p.slug,'') is null then raise exception 'Product name and slug required';end if;
    if p.status='active' and (p.base_price<=0 or p.season_id is null or p.team_id is null or p.league_id is null) then raise exception 'Active products need a positive price, team, league and season';end if;
    if p.team_id is not null and not exists(select 1 from public.teams where id=p.team_id and league_id=p.league_id) then raise exception 'Team and league mismatch';end if;
    if fresh then
      insert into public.products(id,slug,name,team,category,league_id,team_id,season_id,season,collection,description,base_price,fabric,country_colors,featured,status,sleeve)
      values(p.id,p.slug,p.name,coalesce(p.team,'Unassigned'),coalesce(p.category,'Unassigned'),p.league_id,p.team_id,p.season_id,p.season,p.collection,p.description,coalesce(p.base_price,0),p.fabric,p.country_colors,p.featured,p.status,p.sleeve);
    else
      update public.products set slug=p.slug,name=p.name,team=p.team,category=p.category,league_id=p.league_id,team_id=p.team_id,season_id=p.season_id,season=p.season,collection=p.collection,description=p.description,base_price=p.base_price,fabric=p.fabric,country_colors=p.country_colors,featured=p.featured,status=p.status,sleeve=p.sleeve where id=p.id;
    end if;
    pid:=p.id;
    for v in select value from jsonb_array_elements(item->'variants') loop
      select * into vr from public.product_variants where product_id=pid and kit=(v->>'kit')::public.kit_type for update;
      if not found then
        insert into public.product_variants(product_id,kit,name,sku,price,image_front_path,image_back_path,image_arm_path,available)
        values(pid,(v->>'kit')::public.kit_type,v->>'name',nullif(v->>'sku',''),coalesce((v->>'price')::integer,p.base_price),nullif(v->>'image_front_path',''),nullif(v->>'image_back_path',''),nullif(v->>'image_arm_path',''),coalesce((v->>'available')::boolean,false)) returning * into vr;
      else
        update public.product_variants set name=coalesce(nullif(v->>'name',''),vr.name),sku=coalesce(nullif(v->>'sku',''),vr.sku),price=coalesce((v->>'price')::integer,vr.price),
          image_front_path=case when p_import then coalesce(nullif(v->>'image_front_path',''),vr.image_front_path) else nullif(v->>'image_front_path','') end,
          image_back_path=case when p_import then coalesce(nullif(v->>'image_back_path',''),vr.image_back_path) else nullif(v->>'image_back_path','') end,
          image_arm_path=case when p_import then coalesce(nullif(v->>'image_arm_path',''),vr.image_arm_path) else nullif(v->>'image_arm_path','') end,
          available=coalesce((v->>'available')::boolean,vr.available) where id=vr.id returning * into vr;
      end if;
      if vr.available and vr.price<=0 then raise exception 'Available variants require a positive price';end if;
      if not p_import then
        if jsonb_typeof(v->'stock') is distinct from 'array' or jsonb_array_length(v->'stock') not between 1 and 30 then
          raise exception 'Select 1–30 product sizes.' using errcode='22023';
        end if;
        perform set_config('app.stock_reason','Product size availability updated',true);
        update public.inventory set is_active = exists(
          select 1 from jsonb_array_elements(v->'stock') selected where selected->>'size'=inventory.size
        ) where variant_id=vr.id and is_active is distinct from exists(
          select 1 from jsonb_array_elements(v->'stock') selected where selected->>'size'=inventory.size
        );
      end if;
      for stock in select value from jsonb_array_elements(coalesce(v->'stock','[]')) loop
        select * into inv from public.inventory where variant_id=vr.id and size=stock->>'size' for update;
        if found then
          if p_import and stock->>'quantity' is not null then
            if stock->>'version' is null or inv.version<>(stock->>'version')::bigint then raise exception 'Stock changed since preview' using errcode='40001';end if;
            update public.inventory set quantity=(stock->>'quantity')::integer where id=inv.id;
          end if;
        else
          if p_import and coalesce((stock->>'version')::bigint,0)<>0 then raise exception 'Inventory changed since preview' using errcode='40001';end if;
          insert into public.inventory(variant_id,size,quantity,is_active) values(vr.id,stock->>'size',case when p_import then coalesce((stock->>'quantity')::integer,0) else 0 end,true);
        end if;
      end loop;
    end loop;
    result:=result||jsonb_build_array(pid);
  end loop;
  return result;
end $$;
revoke all on function public.save_catalog(jsonb,boolean) from public;
grant execute on function public.save_catalog(jsonb,boolean) to authenticated;


-- Customer RLS protects rows, not columns. Internal notes, checkout tokens and
-- staff history are read only through an admin-checked function.
revoke select on public.orders from public, anon, authenticated;
grant select(id,order_number,customer_name,customer_phone,customer_email,country,region,delivery_address,subtotal,delivery_fee,total,status,delivery_status,payment_method,customer_note,customer_id,created_at,updated_at) on public.orders to authenticated;
revoke select on public.order_status_history from public, anon, authenticated;
grant select(id,order_id,from_status,to_status,created_at) on public.order_status_history to authenticated;

create function public.list_admin_orders(p_offset integer default 0, p_limit integer default 500)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_offset is null or p_limit is null or p_offset<0 or p_limit not between 1 and 500 then raise exception 'Invalid order page.' using errcode='22023'; end if;
  select coalesce(jsonb_agg(to_jsonb(o)||jsonb_build_object(
    'order_items',(select coalesce(jsonb_agg(to_jsonb(i)),'[]') from public.order_items i where i.order_id=o.id),
    'payment_proofs',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.payment_proofs p where p.order_id=o.id),
    'order_status_history',(select coalesce(jsonb_agg(to_jsonb(h)||jsonb_build_object('profiles',jsonb_build_object('display_name',p.display_name)) order by h.created_at),'[]') from public.order_status_history h left join public.profiles p on p.id=h.changed_by where h.order_id=o.id)
  ) order by o.created_at desc,o.id),'[]') into result
  from (select * from public.orders order by created_at desc,id limit p_limit offset p_offset) o;
  return result;
end;
$$;

create function public.list_admin_fonts()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(f) order by category,name,id),'[]') from public.fonts f);
end;
$$;

-- Hosted Supabase projects can grant functions directly to anon/authenticated by
-- default. Revoking only PUBLIC does not remove those grants. Reset custom
-- function privileges, then explicitly restore each supported entry point.
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private') and p.prokind='f'
      and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
  loop execute format('revoke execute on function %s from public, anon, authenticated', f.signature); end loop;
end $$;

grant execute on function private.is_admin() to authenticated;
grant execute on function public.search_catalog_knowledge(text,extensions.vector,text) to anon, authenticated, service_role;
grant execute on function public.claim_knowledge_jobs(), public.finish_knowledge_job(uuid,text,uuid,jsonb,text) to service_role;
grant execute on function public.update_customer_profile(text,text), public.consume_whatsapp_order_quota() to authenticated;
grant execute on function public.save_catalog(jsonb,boolean), public.commit_catalog_import(uuid), public.archive_product(uuid) to authenticated;
grant execute on function public.adjust_inventory(jsonb), public.commit_inventory_import(uuid), public.reverse_inventory_import(uuid) to authenticated;
grant execute on function public.save_admin_order(jsonb,jsonb), public.update_admin_order_status(uuid,public.order_status,text),
  public.update_admin_delivery_status(uuid,public.delivery_status), public.review_payment_proof(uuid,public.payment_status,text), public.delete_admin_order(uuid) to authenticated;
grant execute on function public.list_admin_fonts() to authenticated;
grant execute on function public.list_admin_orders(integer,integer) to authenticated;
grant execute on function public.export_order_records(), public.prepare_commerce_rebuild(), public.clean_commerce_data(uuid,text), public.restore_rebuild_orders(uuid), public.reindex_catalog() to authenticated;
grant execute on function public.start_marketing_job(uuid,integer,text,integer), public.finish_marketing_job(uuid,jsonb,jsonb,text,integer,integer) to authenticated;

-- Keep checkout paused and make future functions require an explicit grant.
revoke all on function public.create_checkout_order(uuid,text,text,text,text,text,text,text,text,jsonb) from public, anon, authenticated;
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges in schema private revoke execute on functions from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
