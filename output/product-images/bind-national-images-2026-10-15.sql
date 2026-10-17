-- User requested Brazil Home/Away: +1 in each configured size; Spain/France: images only.
-- IMAGE BINDING ONLY. Brazil stock was successfully added and verified 2026-10-15.
-- Run only after all ten Storage objects are uploaded and verified.
begin;
select pg_advisory_xact_lock(hashtextextended('tisa-national-kits-2026-10-15',0));
do $batch$
declare affected integer;
begin
 if exists(select 1 from public.product_variants where product_id='f0e2aefd-6da8-4514-9642-d2ec536c3daf' and kit='away') then raise exception 'France Away already exists: stop and review'; end if;
 if (select count(*) from public.jersey_sizes where label in ('S','M','L','XL','2XL'))<>5 then raise exception 'Size catalog changed'; end if;
 perform 1 from public.products where id in ('6dcff4a4-8e93-46cd-88e4-2a4e8dfd7a20','f0e2aefd-6da8-4514-9642-d2ec536c3daf') for update;
 update public.product_variants set image_front_path='products/brazil-2026-27-player/'||kit::text||'/front.webp', image_back_path='products/brazil-2026-27-player/'||kit::text||'/back.webp'
 where product_id='cc39e306-0371-4461-8201-3997793b7cb3' and id in ('1b2d876b-63fe-4ece-9d99-62d9a5f6aa9c','7b1339f4-f30a-4b46-b4db-282a3536d1b0') and image_front_path is null and image_back_path is null;
 get diagnostics affected=row_count; if affected<>2 then raise exception 'Brazil image paths changed'; end if;
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
