alter table public.orders
add column if not exists country text;

update public.orders
set country = 'United Arab Emirates'
where country is null or btrim(country) = '';

alter table public.orders
alter column country set default 'United Arab Emirates',
alter column country set not null;

alter table public.orders
drop column if exists township;
