create or replace function public.export_order_records()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  exported_at timestamptz := clock_timestamp();
begin
  if not private.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'format', 'tisa-order-records-backup',
    'version', 1,
    'exportedAt', exported_at,
    'notes', jsonb_build_array(
      'Payment proof files are stored separately; this backup contains their database records and storage paths.',
      'Authentication users are managed by Supabase Auth and are not included.'
    ),
    'counts', jsonb_build_object(
      'orders', (select count(*) from public.orders),
      'orderItems', (select count(*) from public.order_items),
      'paymentProofs', (select count(*) from public.payment_proofs),
      'statusHistory', (select count(*) from public.order_status_history),
      'paymentMethods', (select count(*) from public.payment_methods)
    ),
    'orders', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.created_at, row_data.id) from public.orders row_data), '[]'::jsonb),
    'orderItems', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.order_id, row_data.created_at, row_data.id) from public.order_items row_data), '[]'::jsonb),
    'paymentProofs', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.order_id, row_data.created_at, row_data.id) from public.payment_proofs row_data), '[]'::jsonb),
    'statusHistory', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.order_id, row_data.created_at, row_data.id) from public.order_status_history row_data), '[]'::jsonb),
    'paymentMethods', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.sort_order, row_data.id) from public.payment_methods row_data), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.export_order_records() from public;
grant execute on function public.export_order_records() to authenticated;

