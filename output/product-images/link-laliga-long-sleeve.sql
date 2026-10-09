-- Bind four verified long-sleeve home images to their exact existing variants.
update public.product_variants as v
set image_front_path = m.folder || '/front.webp',
    image_back_path = m.folder || '/back.webp'
from (values
  ('0c69ef15-2e2f-4868-8a95-2e8c21054a42'::uuid, '8653aa96-806f-44e8-952d-4ae1ae488745'::uuid, 'home', 'products/barcelona-2026-27-player-long-sleeve/home'),
  ('7a93aff5-7854-4df0-bdb6-37a4c75046a1'::uuid, '5ee231d9-29f5-4f7a-baf3-ad5bc1841ed7'::uuid, 'home', 'products/real-madrid-2026-27-player-long-sleeve/home')
) as m(id, product_id, kit, folder)
where v.id = m.id and v.product_id = m.product_id and v.kit::text = m.kit
  and v.image_front_path is null and v.image_back_path is null
returning v.id, v.product_id, v.kit, v.image_front_path, v.image_back_path;
