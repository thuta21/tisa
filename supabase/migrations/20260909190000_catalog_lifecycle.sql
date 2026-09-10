create or replace function public.archive_product(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare product_row public.products%rowtype;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  select * into product_row from public.products where id = p_product_id for update;
  if not found then raise exception 'Product not found.' using errcode = '22023'; end if;
  perform set_config('app.stock_reason', 'Product archived', true);
  update public.products set status = 'archived' where id = p_product_id returning * into product_row;
  update public.product_variants set available = false where product_id = p_product_id;
  update public.inventory set is_active = false
  where variant_id in (select id from public.product_variants where product_id = p_product_id);
  return to_jsonb(product_row);
end;
$$;

revoke all on function public.archive_product(uuid) from public;
grant execute on function public.archive_product(uuid) to authenticated;
revoke insert, update, delete on public.products, public.product_variants from authenticated;

