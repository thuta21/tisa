-- ==========================================
-- 1. SEED TEAMS
-- ==========================================
insert into public.teams (league_id, name, slug, country, sort_order)
values
  ((select id from public.leagues where slug = 'premier-league'), 'Manchester United', 'manchester-united', 'England', 10),
  ((select id from public.leagues where slug = 'premier-league'), 'Manchester City', 'manchester-city', 'England', 20),
  ((select id from public.leagues where slug = 'premier-league'), 'Arsenal', 'arsenal', 'England', 30),
  ((select id from public.leagues where slug = 'premier-league'), 'Liverpool', 'liverpool', 'England', 40),
  ((select id from public.leagues where slug = 'premier-league'), 'Chelsea', 'chelsea', 'England', 50),
  
  ((select id from public.leagues where slug = 'la-liga'), 'Real Madrid', 'real-madrid', 'Spain', 10),
  ((select id from public.leagues where slug = 'la-liga'), 'Barcelona', 'barcelona', 'Spain', 20),
  ((select id from public.leagues where slug = 'la-liga'), 'Atletico Madrid', 'atletico-madrid', 'Spain', 30),
  
  ((select id from public.leagues where slug = 'serie-a'), 'AC Milan', 'ac-milan', 'Italy', 10),
  ((select id from public.leagues where slug = 'serie-a'), 'Inter Milan', 'inter-milan', 'Italy', 20),
  ((select id from public.leagues where slug = 'serie-a'), 'Juventus', 'juventus', 'Italy', 30),
  
  ((select id from public.leagues where slug = 'bundesliga'), 'Bayern Munich', 'bayern-munich', 'Germany', 10),
  ((select id from public.leagues where slug = 'bundesliga'), 'Borussia Dortmund', 'borussia-dortmund', 'Germany', 20),
  
  ((select id from public.leagues where slug = 'world-cup'), 'Argentina', 'argentina', 'Argentina', 10),
  ((select id from public.leagues where slug = 'world-cup'), 'Brazil', 'brazil', 'Brazil', 20),
  ((select id from public.leagues where slug = 'world-cup'), 'France', 'france', 'France', 30),
  ((select id from public.leagues where slug = 'world-cup'), 'Germany', 'germany', 'Germany', 40)
on conflict (slug) do update set
  league_id = excluded.league_id,
  name = excluded.name,
  country = excluded.country,
  sort_order = excluded.sort_order;

-- ==========================================
-- 2. SEED PRODUCTS
-- ==========================================
insert into public.products (slug, name, team, category, collection, description, base_price, season, fabric, weight_gsm, breathability, durability, moisture_wicking, country_colors, featured, status, league_id, team_id, season_id)
values
  (
    'mu-24-25-home', 
    'Manchester United 24/25 Home Jersey', 
    'Manchester United', 
    'Jersey', 
    'Club Jerseys', 
    'Official Manchester United Home Jersey for the 24/25 season. Featuring AEROREADY technology for ultimate comfort and breathability.', 
    80, 
    '2024/25', 
    '100% Recycled Polyester', 
    150, 
    85, 
    90, 
    88, 
    array['#DA020E', '#FFFFFF', '#000000'], 
    true, 
    'active', 
    (select id from public.leagues where slug = 'premier-league'), 
    (select id from public.teams where slug = 'manchester-united'), 
    (select id from public.seasons where slug = '2024-25')
  ),
  (
    'mu-24-25-away', 
    'Manchester United 24/25 Away Jersey', 
    'Manchester United', 
    'Jersey', 
    'Club Jerseys', 
    'Official Manchester United Away Jersey for the 24/25 season. High-performance knit structure with moisture-wicking technology.', 
    80, 
    '2024/25', 
    '100% Recycled Polyester', 
    145, 
    88, 
    85, 
    90, 
    array['#001C55', '#FFFFFF'], 
    false, 
    'active', 
    (select id from public.leagues where slug = 'premier-league'), 
    (select id from public.teams where slug = 'manchester-united'), 
    (select id from public.seasons where slug = '2024-25')
  ),
  (
    'real-madrid-24-25-home', 
    'Real Madrid 24/25 Home Jersey', 
    'Real Madrid', 
    'Jersey', 
    'Club Jerseys', 
    'Official Real Madrid Home Jersey for the 24/25 season. Designed with the classic white base and elegant gold detailing.', 
    85, 
    '2024/25', 
    '100% Polyester', 
    155, 
    82, 
    92, 
    85, 
    array['#FFFFFF', '#F0E68C', '#000000'], 
    true, 
    'active', 
    (select id from public.leagues where slug = 'la-liga'), 
    (select id from public.teams where slug = 'real-madrid'), 
    (select id from public.seasons where slug = '2024-25')
  ),
  (
    'barcelona-24-25-home', 
    'Barcelona 24/25 Home Jersey', 
    'Barcelona', 
    'Jersey', 
    'Club Jerseys', 
    'Official FC Barcelona Home Jersey for the 24/25 season. Striking blaugrana colors with sweat-wicking technical fabric.', 
    85, 
    '2024/25', 
    '100% Recycled Polyester', 
    150, 
    86, 
    88, 
    89, 
    array['#004D98', '#A50044', '#EDBB00'], 
    true, 
    'active', 
    (select id from public.leagues where slug = 'la-liga'), 
    (select id from public.teams where slug = 'barcelona'), 
    (select id from public.seasons where slug = '2024-25')
  ),
  (
    'argentina-2026-home', 
    'Argentina 2026 Home Jersey', 
    'Argentina', 
    'Jersey', 
    'National Teams', 
    'Official Argentina Home Jersey for the 2026 World Cup campaign. Albiceleste stripes with gold champions badge placement.', 
    90, 
    '2026', 
    '100% Recycled Polyester Doubleknit', 
    140, 
    92, 
    87, 
    93, 
    array['#75AADB', '#FFFFFF', '#FCBF49'], 
    true, 
    'active', 
    (select id from public.leagues where slug = 'world-cup'), 
    (select id from public.teams where slug = 'argentina'), 
    (select id from public.seasons where slug = '2026')
  ),
  (
    'brazil-2026-home', 
    'Brazil 2026 Home Jersey', 
    'Brazil', 
    'Jersey', 
    'National Teams', 
    'Official Brazil Home Jersey for the 2026 World Cup. The iconic yellow and green jersey with breathable weave.', 
    90, 
    '2026', 
    '100% Polyester', 
    145, 
    90, 
    89, 
    91, 
    array['#FDE100', '#009C3B', '#002776'], 
    true, 
    'active', 
    (select id from public.leagues where slug = 'world-cup'), 
    (select id from public.teams where slug = 'brazil'), 
    (select id from public.seasons where slug = '2026')
  )
on conflict (slug) do update set
  name = excluded.name,
  team = excluded.team,
  category = excluded.category,
  collection = excluded.collection,
  description = excluded.description,
  base_price = excluded.base_price,
  season = excluded.season,
  fabric = excluded.fabric,
  weight_gsm = excluded.weight_gsm,
  breathability = excluded.breathability,
  durability = excluded.durability,
  moisture_wicking = excluded.moisture_wicking,
  country_colors = excluded.country_colors,
  featured = excluded.featured,
  status = excluded.status,
  league_id = excluded.league_id,
  team_id = excluded.team_id,
  season_id = excluded.season_id;

-- ==========================================
-- 3. SEED PRODUCT VARIANTS
-- ==========================================
insert into public.product_variants (product_id, kit, name, sku, price, image_front_path, image_back_path, available)
values
  ((select id from public.products where slug = 'mu-24-25-home'), 'home', 'Home Kit', 'MU-24-25-H', 80, 'products/mu-home-front.webp', 'products/mu-home-back.webp', true),
  ((select id from public.products where slug = 'mu-24-25-away'), 'away', 'Away Kit', 'MU-24-25-A', 80, 'products/mu-away-front.webp', 'products/mu-away-back.webp', true),
  ((select id from public.products where slug = 'real-madrid-24-25-home'), 'home', 'Home Kit', 'RM-24-25-H', 85, 'products/rm-home-front.webp', 'products/rm-home-back.webp', true),
  ((select id from public.products where slug = 'barcelona-24-25-home'), 'home', 'Home Kit', 'FCB-24-25-H', 85, 'products/fcb-home-front.webp', 'products/fcb-home-back.webp', true),
  ((select id from public.products where slug = 'argentina-2026-home'), 'home', 'Home Kit', 'ARG-26-H', 90, 'products/arg-home-front.webp', 'products/arg-home-back.webp', true),
  ((select id from public.products where slug = 'brazil-2026-home'), 'home', 'Home Kit', 'BRA-26-H', 90, 'products/bra-home-front.webp', 'products/bra-home-back.webp', true)
on conflict (sku) do update set
  product_id = excluded.product_id,
  kit = excluded.kit,
  name = excluded.name,
  price = excluded.price,
  image_front_path = excluded.image_front_path,
  image_back_path = excluded.image_back_path,
  available = excluded.available;

-- ==========================================
-- 4. SEED INVENTORY
-- ==========================================
insert into public.inventory (variant_id, size, quantity, reserved)
select v.id, sz.label, 50, 0
from public.product_variants v
cross join (
  select label from public.jersey_sizes
) sz
on conflict (variant_id, size) do update set
  quantity = excluded.quantity,
  reserved = excluded.reserved;

-- ==========================================
-- 5. SEED ORDERS
-- ==========================================
insert into public.orders (order_number, customer_name, customer_phone, customer_email, country, region, delivery_address, subtotal, delivery_fee, total, status, delivery_status, customer_note)
values
  ('ORD-2026-0001', 'Thuta Sann', '09123456789', 'thuta@example.com', 'United Arab Emirates', 'Dubai', 'Marina Heights, Tower A, Apt 4502', 165, 10, 175, 'paid', 'processing', 'Please deliver after 5 PM'),
  ('ORD-2026-0002', 'Kyaw Kyaw', '09987654321', 'kyaw@example.com', 'Myanmar', 'Yangon', 'No. 123, Pyay Road, Kamayut Township', 90, 0, 90, 'awaiting_payment', 'pending', null),
  ('ORD-2026-0003', 'Aung Aung', '09555444333', 'aung@example.com', 'United Arab Emirates', 'Abu Dhabi', 'Khalifa City, Sector 12, Villa 4', 240, 15, 255, 'delivered', 'delivered', null)
on conflict (order_number) do update set
  customer_name = excluded.customer_name,
  customer_phone = excluded.customer_phone,
  customer_email = excluded.customer_email,
  country = excluded.country,
  region = excluded.region,
  delivery_address = excluded.delivery_address,
  subtotal = excluded.subtotal,
  delivery_fee = excluded.delivery_fee,
  total = excluded.total,
  status = excluded.status,
  delivery_status = excluded.delivery_status,
  customer_note = excluded.customer_note;

-- ==========================================
-- 6. SEED ORDER ITEMS
-- ==========================================
delete from public.order_items
where order_id in (
  select id from public.orders
  where order_number in ('ORD-2026-0001', 'ORD-2026-0002', 'ORD-2026-0003')
);

insert into public.order_items (order_id, product_id, variant_id, product_name, kit_name, size, custom_name, custom_number, quantity, unit_price, line_total)
values
  (
    (select id from public.orders where order_number = 'ORD-2026-0001'),
    (select id from public.products where slug = 'mu-24-25-home'),
    (select id from public.product_variants where sku = 'MU-24-25-H'),
    'Manchester United 24/25 Home Jersey',
    'Home Kit',
    'L',
    'BRUNO',
    '8',
    1,
    80,
    80
  ),
  (
    (select id from public.orders where order_number = 'ORD-2026-0001'),
    (select id from public.products where slug = 'real-madrid-24-25-home'),
    (select id from public.product_variants where sku = 'RM-24-25-H'),
    'Real Madrid 24/25 Home Jersey',
    'Home Kit',
    'M',
    'MBAPPE',
    '9',
    1,
    85,
    85
  ),
  (
    (select id from public.orders where order_number = 'ORD-2026-0002'),
    (select id from public.products where slug = 'argentina-2026-home'),
    (select id from public.product_variants where sku = 'ARG-26-H'),
    'Argentina 2026 Home Jersey',
    'Home Kit',
    'M',
    'MESSI',
    '10',
    1,
    90,
    90
  ),
  (
    (select id from public.orders where order_number = 'ORD-2026-0003'),
    (select id from public.products where slug = 'mu-24-25-home'),
    (select id from public.product_variants where sku = 'MU-24-25-H'),
    'Manchester United 24/25 Home Jersey',
    'Home Kit',
    'XL',
    null,
    null,
    3,
    80,
    240
  );

-- ==========================================
-- 7. SEED ORDER STATUS HISTORY
-- ==========================================
delete from public.order_status_history
where order_id in (
  select id from public.orders
  where order_number in ('ORD-2026-0001', 'ORD-2026-0002', 'ORD-2026-0003')
);

insert into public.order_status_history (order_id, from_status, to_status, note)
values
  ((select id from public.orders where order_number = 'ORD-2026-0001'), 'awaiting_payment', 'verification_pending', 'Customer uploaded payment proof'),
  ((select id from public.orders where order_number = 'ORD-2026-0001'), 'verification_pending', 'paid', 'Payment verified successfully'),
  ((select id from public.orders where order_number = 'ORD-2026-0001'), 'paid', 'processing', 'Order sent to warehouse for processing'),
  
  ((select id from public.orders where order_number = 'ORD-2026-0002'), null, 'awaiting_payment', 'Order created'),
  
  ((select id from public.orders where order_number = 'ORD-2026-0003'), 'awaiting_payment', 'paid', 'Payment verified'),
  ((select id from public.orders where order_number = 'ORD-2026-0003'), 'paid', 'processing', 'Processing order'),
  ((select id from public.orders where order_number = 'ORD-2026-0003'), 'processing', 'shipped', 'Shipped via Express Delivery'),
  ((select id from public.orders where order_number = 'ORD-2026-0003'), 'shipped', 'delivered', 'Delivered to customer');

-- ==========================================
-- 8. SEED PAYMENT PROOFS
-- ==========================================
delete from public.payment_proofs
where order_id in (
  select id from public.orders
  where order_number in ('ORD-2026-0001', 'ORD-2026-0002', 'ORD-2026-0003')
);

insert into public.payment_proofs (order_id, provider, transaction_id, amount, storage_path, status)
values
  ((select id from public.orders where order_number = 'ORD-2026-0001'), 'kpay', 'TXN1234567890', 175, 'proofs/ord-2026-0001-kpay.png', 'verified'),
  ((select id from public.orders where order_number = 'ORD-2026-0003'), 'wave', 'TXN0987654321', 255, 'proofs/ord-2026-0003-wave.png', 'verified')
on conflict (provider, transaction_id) do update set
  status = excluded.status,
  amount = excluded.amount,
  storage_path = excluded.storage_path;
