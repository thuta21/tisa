# TISA collection preview route audit

Checked on 8 October 2026 against a local production build.

75 read-only HTTP checks passed, including all 21 active jersey detail URLs and every page/handler route family. Unknown pages and unknown jerseys return 404. Protected admin pages redirect to admin login; admin GET handlers reject anonymous access or unsupported methods.

## UI changes

- Navigation now exposes Home, Collection, About TISA, Fit Guide, Privacy and Preview Terms.
- Cart, checkout, customer login/registration/accounts, font sales and public pricelists display the launch notice.
- The collection and jersey details omit prices, stock urgency, quantity controls, purchase buttons and payment/delivery promises.
- The inactive contact form and placeholder FAQs are replaced with useful preview information.
- Homepage selectors include only teams and leagues that have preview jerseys.
- Kit selectors respect the admin availability switch, including when an admin browses the public site. Missing kit images never reuse another kit's photo; missing back images disable Back view. See [catalog availability audit](catalog-availability-audit.md).
- Missing jersey images use a neutral labeled placeholder; the homepage starts with a jersey that has a real catalog image.
- Size guides support keyboard focus, Escape, mobile table scrolling and reduced motion.

## Validation

- `pnpm lint`: passed.
- `pnpm test`: 9 files, 38 tests passed, including catalog availability regression tests and a real PostgreSQL test of the checkout permission revocation.
- `pnpm build`: passed, including TypeScript checks.
- Browser checks: desktop and 390px mobile; navigation, collection search, product details, size guide and informational/closed routes. No page overflow or commerce links were found on the sampled information pages.
- Font preview returns PNG with both a fallback font and a private font.

## Remaining hosted database step

`supabase/migrations/20261008120000_pause_public_checkout.sql` must be applied through Supabase SQL Editor or a privileged migration connection. The session only has the application publishable key, so the hosted database revocation has not been applied. The local PostgreSQL migration test verifies that both anonymous and authenticated customers lose RPC execution access while existing data and admin order management remain intact.

Authenticated admin UI was inspected in source and its route protection was tested. An authenticated browser walkthrough was not performed because no admin login was supplied. No live hosting deployment was performed.

## HTTP results

| Route | Status | Result |
| --- | --- | --- |
| `/` | 200 | Passed |
| `/account` | 200 | Online ordering is not open yet. |
| `/admin` | 307 | Admin login redirect |
| `/admin/data-migration` | 307 | Admin login redirect |
| `/admin/inventory` | 307 | Admin login redirect |
| `/admin/login` | 200 | Login |
| `/admin/orders` | 307 | Admin login redirect |
| `/admin/overview` | 307 | Admin login redirect |
| `/admin/payments` | 307 | Admin login redirect |
| `/admin/print` | 307 | Admin login redirect |
| `/admin/products` | 307 | Admin login redirect |
| `/admin/settings` | 307 | Admin login redirect |
| `/cart` | 200 | Online ordering is not open yet. |
| `/checkout` | 200 | Online ordering is not open yet. |
| `/contact` | 200 | A first look at what we’re preparing. |
| `/customer-care` | 200 | Find your fit. |
| `/fonts` | 200 | Online ordering is not open yet. |
| `/forgot-password` | 200 | Reset admin password |
| `/launch` | 200 | Online ordering is not open yet. |
| `/login` | 200 | Online ordering is not open yet. |
| `/pricelists` | 200 | Online ordering is not open yet. |
| `/privacy` | 200 | Your visit to the TISA preview. |
| `/register` | 200 | Online ordering is not open yet. |
| `/reset-password` | 200 | Checking reset link |
| `/shop` | 200 | Find your team. |
| `/terms` | 200 | About this collection preview. |
| `/api/admin/inventory` | 401 | Passed |
| `/api/admin/inventory/export` | 401 | Passed |
| `/api/admin/inventory/import` | 405 | Passed |
| `/api/admin/inventory/template` | 401 | Passed |
| `/api/admin/knowledge` | 401 | Passed |
| `/api/admin/leagues/logos` | 405 | Passed |
| `/api/admin/orders` | 405 | Passed |
| `/api/admin/orders/backup` | 401 | Passed |
| `/api/admin/products` | 405 | Passed |
| `/api/admin/products/import` | 405 | Passed |
| `/api/admin/products/publish-available` | 405 | Passed |
| `/api/admin/products/template` | 401 | Passed |
| `/api/admin/rebuild` | 401 | Passed |
| `/api/admin/teams/logos` | 405 | Passed |
| `/api/catalog/search` | 400 | Passed |
| `/api/font-preview` | 200 | Passed |
| `/auth/callback` | 307 | Passed |
| `/jersey/chelsea-2026-27-player` | 200 | Chelsea 2026/27 Player Version |
| `/jersey/real-madrid-2026-27-player` | 200 | Real Madrid 2026/27 Player Version |
| `/jersey/barcelona-2026-27-player` | 200 | Barcelona 2026/27 Player Version |
| `/jersey/atletico-madrid-2026-27-player` | 200 | Atletico Madrid 2026/27 Player Version |
| `/jersey/manchester-city-2026-27-player-long-sleeve` | 200 | Manchester City 2026/27 Player Version Long Sleeve |
| `/jersey/liverpool-2026-27-player` | 200 | Liverpool 2026/27 Player Version |
| `/jersey/manchester-united-2026-27-player` | 200 | Manchester United 2026/27 Player Version |
| `/jersey/arsenal-2026-27-player` | 200 | Arsenal 2026/27 Player Version |
| `/jersey/manchester-city-2026-27-player` | 200 | Manchester City 2026/27 Player Version |
| `/jersey/psg-2026-27-player` | 200 | PSG 2026/27 Player Version |
| `/jersey/bayern-munich-2026-27-player` | 200 | Bayern Munich 2026/27 Player Version |
| `/jersey/tottenham-hotspur-2026-27-player` | 200 | Tottenham Hotspur 2026/27 Player Version |
| `/jersey/inter-miami-2026-27-player` | 200 | Inter Miami 2026/27 Player Version |
| `/jersey/manchester-united-2026-27-player-long-sleeve` | 200 | Manchester United 2026/27 Player Version Long Sleeve |
| `/jersey/arsenal-2026-27-player-long-sleeve` | 200 | Arsenal 2026/27 Player Version Long Sleeve |
| `/jersey/liverpool-2026-27-player-long-sleeve` | 200 | Liverpool 2026/27 Player Version Long Sleeve |
| `/jersey/barcelona-2026-27-player-long-sleeve` | 200 | Barcelona 2026/27 Player Version Long Sleeve |
| `/jersey/real-madrid-2026-27-player-long-sleeve` | 200 | Real Madrid 2026/27 Player Version Long Sleeve |
| `/jersey/spain-2026-27-player` | 200 | Spain 2026/27 Player Version |
| `/jersey/argentina-2026-27-player` | 200 | Argentina 2026/27 Player Version |
| `/jersey/france-2026-27-player` | 200 | France 2026/27 Player Version |
| `/admin/settings/leagues` | 307 | Admin login redirect |
| `/admin/settings/sizes` | 307 | Admin login redirect |
| `/admin/settings/teams` | 307 | Admin login redirect |
| `/admin/settings/seasons` | 307 | Admin login redirect |
| `/admin/settings/charges` | 307 | Admin login redirect |
| `/admin/settings/payment_methods` | 307 | Admin login redirect |
| `/admin/settings/fonts` | 307 | Admin login redirect |
| `/jersey/tisa-route-audit-missing` | 404 | Passed |
| `/tisa-route-audit-missing` | 404 | Page not found. |
| `/api/catalog/search?q=Liverpool` | 200 | Passed |
| `/api/font-preview?font=sfm-brazil-wc-2026&variant=jersey` | 200 | Passed |
