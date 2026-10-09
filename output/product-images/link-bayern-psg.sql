-- Attach the six processed short-sleeve photos after storage verification.
update public.product_variants as v
set image_front_path = m.folder || '/front.webp',
    image_back_path = m.folder || '/back.webp'
from (values
  ('3c35e40e-800c-4735-b0bb-030595c5ad98'::uuid, '83db44a3-422a-416a-bf59-d8f5657cfecf'::uuid, 'home', 'products/bayern-munich-2026-27-player/home'),
  ('a8c5b919-894c-4d4c-86c2-8e74600c2816'::uuid, 'ac96f316-32dd-461f-84b4-1a5321b1c5f5'::uuid, 'home', 'products/psg-2026-27-player/home'),
  ('584b66d9-fc92-4c19-bfa6-35e7745338cd'::uuid, 'ac96f316-32dd-461f-84b4-1a5321b1c5f5'::uuid, 'away', 'products/psg-2026-27-player/away')
) as m(id, product_id, kit, folder)
where v.id = m.id
  and v.product_id = m.product_id
  and v.kit::text = m.kit
  and v.image_front_path is null
  and v.image_back_path is null
returning v.id, v.product_id, v.kit, v.image_front_path, v.image_back_path;
