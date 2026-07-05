alter table public.fonts
add column if not exists category text not null default 'Uncategorized',
add column if not exists preview_text text not null default 'CHAMPIONS 10',
add column if not exists file_path text,
add column if not exists delivery_file_path text;

update public.fonts
set
  category = coalesce(nullif(category, ''), 'Uncategorized'),
  preview_text = coalesce(nullif(preview_text, ''), 'CHAMPIONS 10'),
  file_path = coalesce(file_path, nullif(regexp_replace(coalesce(font_url, ''), '^/+', ''), ''), 'fonts/' || slug || '.ttf'),
  delivery_file_path = coalesce(delivery_file_path, file_path, nullif(regexp_replace(coalesce(font_url, ''), '^/+', ''), ''), 'fonts/' || slug || '.ttf');

update storage.buckets
set public = false
where id = 'fonts';

revoke select on public.fonts from anon;
revoke select on public.fonts from authenticated;

grant select (id, name, slug, category, preview_text, price, created_at, updated_at)
on public.fonts to anon, authenticated;

grant insert, update, delete on public.fonts to authenticated;

alter table public.order_items
add column if not exists font_slug text;

insert into public.fonts (
  name,
  slug,
  category,
  preview_text,
  file_path,
  delivery_file_path,
  font_url,
  price
)
values (
  'SFM Brazil WC 2026',
  'sfm-brazil-wc-2026',
  'World Cup',
  'BRAZIL 10',
  'fonts/sfm-brazil-wc-2026.ttf',
  'fonts/sfm-brazil-wc-2026.ttf',
  '',
  0
)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  preview_text = excluded.preview_text,
  file_path = excluded.file_path,
  delivery_file_path = excluded.delivery_file_path,
  updated_at = now();
