-- User requested Brazil Home/Away: +1 in each configured size; Spain/France: images only.
-- One transaction, exact identity/null guards; rerunning refuses a duplicate Brazil addition.
begin;
select pg_advisory_xact_lock(hashtextextended('tisa-national-kits-2026-10-15',0));
do $batch$
declare affected integer;
begin
 if exists(select 1 from public.products where lower(team)='brazil' or slug ilike '%brazil%') then raise exception 'Brazil already exists: stop and review instead of duplicating stock'; end if;
 if exists(select 1 from public.product_variants where product_id='f0e2aefd-6da8-4514-9642-d2ec536c3daf' and kit='away') then raise exception 'France Away already exists: stop and review'; end if;
 if (select count(*) from public.jersey_sizes where label in ('S','M','L','XL','2XL'))<>5 then raise exception 'Size catalog changed'; end if;
 perform 1 from public.products where id in ('6dcff4a4-8e93-46cd-88e4-2a4e8dfd7a20','f0e2aefd-6da8-4514-9642-d2ec536c3daf') for update;
 insert into public.products(id,slug,name,team,category,collection,base_price,season,status,league_id,team_id,season_id,sleeve)
 select 'cc39e306-0371-4461-8201-3997793b7cb3','brazil-2026-27-player','Brazil 2026/27 Player Version','Brazil',p.category,p.collection,p.base_price,p.season,'active',p.league_id,'12f15d58-3dca-4c3e-99d9-28e2c11ae6d5',p.season_id,'short'
 from public.products p where p.id='6dcff4a4-8e93-46cd-88e4-2a4e8dfd7a20' and p.base_price=65;
 get diagnostics affected=row_count; if affected<>1 then raise exception 'Brazil reference metadata changed'; end if;
 insert into public.product_variants(id,product_id,kit,name,price,available,image_front_path,image_back_path) values
 ('1b2d876b-63fe-4ece-9d99-62d9a5f6aa9c','cc39e306-0371-4461-8201-3997793b7cb3','home','Home Player Version',65,true,'products/brazil-2026-27-player/home/front.webp','products/brazil-2026-27-player/home/back.webp'),
 ('7b1339f4-f30a-4b46-b4db-282a3536d1b0','cc39e306-0371-4461-8201-3997793b7cb3','away','Away Player Version',65,true,'products/brazil-2026-27-player/away/front.webp','products/brazil-2026-27-player/away/back.webp');
 perform set_config('app.stock_reason','User requested Brazil Home/Away restock: +1 per size S through 2XL, 2026-10-15',true);
 insert into public.inventory(variant_id,size,quantity,reserved,is_active)
 select v.id,s.label,1,0,true from public.product_variants v cross join public.jersey_sizes s
 where v.product_id='cc39e306-0371-4461-8201-3997793b7cb3' and s.label in ('S','M','L','XL','2XL');
 get diagnostics affected=row_count; if affected<>10 then raise exception 'Expected exactly ten Brazil size additions'; end if;
 update public.product_variants set image_front_path='products/spain-2026-27-player/'||kit::text||'/front.webp', image_back_path='products/spain-2026-27-player/'||kit::text||'/back.webp'
 where product_id='6dcff4a4-8e93-46cd-88e4-2a4e8dfd7a20' and id in ('bb4b9d19-0d4b-476a-a2ed-e18e4990cecc','f02f65a3-5c4c-4ec3-9212-c77bad7baea4') and kit in ('home','away') and image_front_path is null and image_back_path is null;
 get diagnostics affected=row_count; if affected<>2 then raise exception 'Spain image paths changed: review before replacing'; end if;
 insert into public.product_variants(id,product_id,kit,name,price,available,image_front_path,image_back_path)
 select '15c7286b-443f-43c7-9d99-c3a30054b545',p.id,'away','Away Player Version',v.price,true,'products/france-2026-27-player/away/front.webp','products/france-2026-27-player/away/back.webp'
 from public.products p join public.product_variants v on v.product_id=p.id and v.kit='home'
 where p.id='f0e2aefd-6da8-4514-9642-d2ec536c3daf';
 get diagnostics affected=row_count; if affected<>1 then raise exception 'France reference variant changed'; end if;
end $batch$;
commit;
select p.slug,v.kit,v.image_front_path,v.image_back_path,coalesce((select jsonb_object_agg(i.size,i.quantity) from public.inventory i where i.variant_id=v.id),'{}'::jsonb) as stock
from public.products p join public.product_variants v on v.product_id=p.id
where p.id='cc39e306-0371-4461-8201-3997793b7cb3' or (p.id='6dcff4a4-8e93-46cd-88e4-2a4e8dfd7a20' and v.kit in ('home','away')) or (p.id='f0e2aefd-6da8-4514-9642-d2ec536c3daf' and v.kit='away') order by p.slug,v.kit;
