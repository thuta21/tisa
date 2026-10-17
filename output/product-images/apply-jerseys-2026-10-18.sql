-- User requested 16 jersey images; create only absent Germany/Portugal products with 2 per size.
-- Images are bundled in public/products; existing inventory must stay unchanged.
begin;
select pg_advisory_xact_lock(hashtextextended('tisa-jersey-batch-2026-10-18',0));
do $batch$
declare affected integer;
begin
 if (select count(*) from public.jersey_sizes where label in ('S','M','L','XL','2XL'))<>5 then raise exception 'Size catalog changed'; end if;
 perform set_config('app.stock_reason','User requested new Germany/Portugal products with 2 per size, 2026-10-18',true);
 if exists(select 1 from public.products where team_id='007c07c1-858f-4b80-927a-6e9174f74620' and season='2026/27' and sleeve='short') then raise exception 'Germany already exists; review without duplicating stock'; end if;
 insert into public.products(id,slug,name,team,category,collection,base_price,season,status,league_id,team_id,season_id,sleeve)
 select '887435c4-1776-4fd3-8116-b5574f4f927f','germany-2026-27-player','Germany 2026/27 Player Version','Germany',category,collection,base_price,season,'active',league_id,'007c07c1-858f-4b80-927a-6e9174f74620',season_id,'short' from public.products where id='6dcff4a4-8e93-46cd-88e4-2a4e8dfd7a20' and base_price=65;
 get diagnostics affected=row_count; if affected<>1 then raise exception 'Reference product changed'; end if;
 insert into public.product_variants(id,product_id,kit,name,price,available,image_front_path,image_back_path) values ('f2716a76-9432-48a9-bda2-17e69dcc5a6a','887435c4-1776-4fd3-8116-b5574f4f927f','home','Home Player Version',65,true,'/products/germany-2026-27-player/home/front.webp','/products/germany-2026-27-player/home/back.webp');
 insert into public.inventory(variant_id,size,quantity,reserved,is_active) select 'f2716a76-9432-48a9-bda2-17e69dcc5a6a',label,2,0,true from public.jersey_sizes where label in ('S','M','L','XL','2XL');
 get diagnostics affected=row_count; if affected<>5 then raise exception 'Expected five sizes'; end if;
 if exists(select 1 from public.products where team_id='1e9b4d5a-efcd-4c78-a5ee-23058739831c' and season='2026/27' and sleeve='short') then raise exception 'Portugal already exists; review without duplicating stock'; end if;
 insert into public.products(id,slug,name,team,category,collection,base_price,season,status,league_id,team_id,season_id,sleeve)
 select 'cd7e813b-20a6-4670-8353-e5675dba15ae','portugal-2026-27-player','Portugal 2026/27 Player Version','Portugal',category,collection,base_price,season,'active',league_id,'1e9b4d5a-efcd-4c78-a5ee-23058739831c',season_id,'short' from public.products where id='6dcff4a4-8e93-46cd-88e4-2a4e8dfd7a20' and base_price=65;
 get diagnostics affected=row_count; if affected<>1 then raise exception 'Reference product changed'; end if;
 insert into public.product_variants(id,product_id,kit,name,price,available,image_front_path,image_back_path) values ('a59454be-82f1-454d-ad73-e35c962057bb','cd7e813b-20a6-4670-8353-e5675dba15ae','home','Home Player Version',65,true,'/products/portugal-2026-27-player/home/front.webp','/products/portugal-2026-27-player/home/back.webp');
 insert into public.inventory(variant_id,size,quantity,reserved,is_active) select 'a59454be-82f1-454d-ad73-e35c962057bb',label,2,0,true from public.jersey_sizes where label in ('S','M','L','XL','2XL');
 get diagnostics affected=row_count; if affected<>5 then raise exception 'Expected five sizes'; end if;
 update public.product_variants v set image_front_path='/products/brazil-2026-27-player/home/front.webp',image_back_path='/products/brazil-2026-27-player/home/back.webp' from public.products p where v.product_id=p.id and p.slug='brazil-2026-27-player' and v.id='1b2d876b-63fe-4ece-9d99-62d9a5f6aa9c' and v.kit='home' and v.image_front_path is null and v.image_back_path is null;
 get diagnostics affected=row_count; if affected<>1 then raise exception 'brazil-2026-27-player home image paths changed'; end if;
 update public.product_variants v set image_front_path='/products/brazil-2026-27-player/away/front.webp',image_back_path='/products/brazil-2026-27-player/away/back.webp' from public.products p where v.product_id=p.id and p.slug='brazil-2026-27-player' and v.id='7b1339f4-f30a-4b46-b4db-282a3536d1b0' and v.kit='away' and v.image_front_path is null and v.image_back_path is null;
 get diagnostics affected=row_count; if affected<>1 then raise exception 'brazil-2026-27-player away image paths changed'; end if;
 update public.product_variants v set image_front_path='/products/spain-2026-27-player/home/front.webp',image_back_path='/products/spain-2026-27-player/home/back.webp' from public.products p where v.product_id=p.id and p.slug='spain-2026-27-player' and v.id='bb4b9d19-0d4b-476a-a2ed-e18e4990cecc' and v.kit='home' and v.image_front_path is null and v.image_back_path is null;
 get diagnostics affected=row_count; if affected<>1 then raise exception 'spain-2026-27-player home image paths changed'; end if;
 update public.product_variants v set image_front_path='/products/spain-2026-27-player/away/front.webp',image_back_path='/products/spain-2026-27-player/away/back.webp' from public.products p where v.product_id=p.id and p.slug='spain-2026-27-player' and v.id='f02f65a3-5c4c-4ec3-9212-c77bad7baea4' and v.kit='away' and v.image_front_path is null and v.image_back_path is null;
 get diagnostics affected=row_count; if affected<>1 then raise exception 'spain-2026-27-player away image paths changed'; end if;
 update public.product_variants v set image_front_path='/products/inter-miami-2026-27-player/home/front.webp',image_back_path='/products/inter-miami-2026-27-player/home/back.webp' from public.products p where v.product_id=p.id and p.slug='inter-miami-2026-27-player' and v.id='6b10552e-9863-4c82-8974-601c6a15a896' and v.kit='home' and v.image_front_path is null and v.image_back_path is null;
 get diagnostics affected=row_count; if affected<>1 then raise exception 'inter-miami-2026-27-player home image paths changed'; end if;
 if exists(select 1 from public.product_variants where product_id='f0e2aefd-6da8-4514-9642-d2ec536c3daf' and kit='away') then raise exception 'France Away exists; review'; end if;
 insert into public.product_variants(id,product_id,kit,name,price,available,image_front_path,image_back_path) select '15c7286b-443f-43c7-9d99-c3a30054b545',product_id,'away','Away Player Version',price,true,'/products/france-2026-27-player/away/front.webp','/products/france-2026-27-player/away/back.webp' from public.product_variants where id='16e061df-6bb5-4902-ae5f-b0d34cd222fd';
 get diagnostics affected=row_count; if affected<>1 then raise exception 'France Home reference changed'; end if;
end $batch$;
commit;
select p.slug,v.kit,v.image_front_path,v.image_back_path,coalesce((select jsonb_object_agg(i.size,i.quantity) from public.inventory i where i.variant_id=v.id),'{}') stock from public.products p join public.product_variants v on v.product_id=p.id where p.slug in ('brazil-2026-27-player','spain-2026-27-player','france-2026-27-player','inter-miami-2026-27-player','germany-2026-27-player','portugal-2026-27-player') order by p.slug,v.kit;
