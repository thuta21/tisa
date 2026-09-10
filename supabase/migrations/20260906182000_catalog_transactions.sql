create function public.save_catalog(p_records jsonb,p_import boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
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

create function public.commit_catalog_import(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.inventory_imports%rowtype; answer jsonb;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
  select * into b from public.inventory_imports where id=p_id for update;
  if not found then raise exception 'Import not found';end if;
  if b.status='committed' then return b.result;end if;
  if b.status<>'preview' then raise exception 'Import is not a preview';end if;
  perform pg_advisory_xact_lock(hashtextextended(b.source_hash,0));
  if exists(select 1 from public.inventory_imports where source_hash=b.source_hash and status='committed') then raise exception 'Workbook already committed' using errcode='40001';end if;
  perform set_config('app.stock_import',p_id::text,true);
  perform set_config('app.stock_reason','Product workbook import',true);
  answer:=public.save_catalog(b.payload->'products',true);
  update public.inventory_imports set status='committed',committed_at=now(),result=jsonb_build_object('products',answer) where id=p_id;
  return answer;
end $$;
revoke all on function public.commit_catalog_import(uuid) from public;
grant execute on function public.commit_catalog_import(uuid) to authenticated;
