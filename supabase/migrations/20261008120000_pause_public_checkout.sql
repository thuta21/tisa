-- Pause public ordering during the collection preview. Existing orders,
-- inventory and admin order-management functions are preserved.
-- Customer INSERT policies were removed by the secure checkout migration.
-- Revoking this RPC also blocks old tabs and requests sent directly to Supabase.
revoke execute on function public.create_checkout_order(
  uuid, text, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;

-- After licensing and launch review, restore access with a separate migration:
-- grant execute on function public.create_checkout_order(
--   uuid, text, text, text, text, text, text, text, text, jsonb
-- ) to anon, authenticated;
