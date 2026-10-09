-- Attach 18 verified images to nine matching kit variants.
update public.product_variants as v
set image_front_path = m.folder || '/front.webp',
    image_back_path = m.folder || '/back.webp'
from (values
  ('3c35e40e-800c-4735-b0bb-030595c5ad98'::uuid, '83db44a3-422a-416a-bf59-d8f5657cfecf'::uuid, 'home', 'products/bayern-munich-2026-27-player/home'),
  ('a8c5b919-894c-4d4c-86c2-8e74600c2816'::uuid, 'ac96f316-32dd-461f-84b4-1a5321b1c5f5'::uuid, 'home', 'products/psg-2026-27-player/home'),
  ('584b66d9-fc92-4c19-bfa6-35e7745338cd'::uuid, 'ac96f316-32dd-461f-84b4-1a5321b1c5f5'::uuid, 'away', 'products/psg-2026-27-player/away'),
  ('3a36d8cd-c0b6-4df0-98cb-a0dbee3a7d18'::uuid, '08beaba8-bf1d-4bd6-b3b5-e0f42a9b5380'::uuid, 'home', 'products/argentina-2026-27-player/home'),
  ('16e061df-6bb5-4902-ae5f-b0d34cd222fd'::uuid, 'f0e2aefd-6da8-4514-9642-d2ec536c3daf'::uuid, 'home', 'products/france-2026-27-player/home'),
  ('ef0c9886-3d20-4582-b6e6-0a883f0462cf'::uuid, 'e4526d38-f28b-44a4-b051-1d443d75020a'::uuid, 'home', 'products/arsenal-2026-27-player-long-sleeve/home'),
  ('1880764a-d490-4234-8743-577612f92e37'::uuid, '31a1523f-3f3c-45e3-8e15-fc6ed5f67457'::uuid, 'home', 'products/manchester-united-2026-27-player-long-sleeve/home'),
  ('2f9d0052-630d-4577-bea2-82fd7fcf4fd4'::uuid, '3d45e2fc-e098-46ac-819b-eacf64cfc0c3'::uuid, 'home', 'products/manchester-city-2026-27-player-long-sleeve/home'),
  ('ed5e4b67-b433-406f-a005-5b8b1b01bdd1'::uuid, '3b3e73c0-4f90-4a57-ba01-144e6afcfa6f'::uuid, 'home', 'products/liverpool-2026-27-player-long-sleeve/home')
) as m(id, product_id, kit, folder)
where v.id = m.id
  and v.product_id = m.product_id
  and v.kit::text = m.kit
  and v.image_front_path is null
  and v.image_back_path is null
returning v.id, v.product_id, v.kit, v.image_front_path, v.image_back_path;
