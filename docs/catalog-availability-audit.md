# Catalog availability audit

Checked the hosted Supabase public catalog on 8 October 2026: 21 active products and 30 publicly visible kit variants. No public Third kit variants were returned. Arsenal short sleeve exposes Home and Away; Arsenal long sleeve exposes Home.

The public variant policy hides unavailable variants, while the admin policy allows reading disabled variants. The previous preview selectors checked only whether a variant ID existed. This let an admin browsing the storefront select disabled kit records. Both selectors now use the explicit admin availability flag and variant identity. Enabled kits can still be previewed with zero stock because ordering is paused; purchase availability continues to require stock.

When switching a team, season or sleeve, selection is checked against that specific product. If no kit is enabled, no disabled kit is selected. Disabled kits do not contribute available stock or sizes to the catalog mapping.

23 visible kit variants have no configured front image and no configured back image. Missing front images now use the neutral placeholder for that exact kit. Missing back images disable Back view. Images are never borrowed from another kit or sleeve, and a front image is never labeled as a back view. These catalog image fields still need the correct product photos.

## Public catalog findings

Disabled variant rows are omitted by Supabase row-level security; this table lists publicly visible variants only. No live catalog records were changed.

| Product slug | Visible kits | Missing front image | Missing back image |
| --- | --- | --- | --- |
| chelsea-2026-27-player | Home, Away | Home, Away | Home, Away |
| real-madrid-2026-27-player | Home, Away | Home, Away | Home, Away |
| barcelona-2026-27-player | Home, Away | Home, Away | Home, Away |
| atletico-madrid-2026-27-player | Away | Away | Away |
| manchester-city-2026-27-player-long-sleeve | Home | Home | Home |
| liverpool-2026-27-player | Home, Away | None | None |
| manchester-united-2026-27-player | Home, Away | Away | Away |
| arsenal-2026-27-player | Home, Away | None | None |
| manchester-city-2026-27-player | Home, Away | None | None |
| psg-2026-27-player | Home, Away | Home, Away | Home, Away |
| bayern-munich-2026-27-player | Home | Home | Home |
| tottenham-hotspur-2026-27-player | Home | Home | Home |
| inter-miami-2026-27-player | Home | Home | Home |
| manchester-united-2026-27-player-long-sleeve | Home | Home | Home |
| arsenal-2026-27-player-long-sleeve | Home | Home | Home |
| liverpool-2026-27-player-long-sleeve | Home | Home | Home |
| barcelona-2026-27-player-long-sleeve | Home | Home | Home |
| real-madrid-2026-27-player-long-sleeve | Home | Home | Home |
| spain-2026-27-player | Home, Away | Home, Away | Home, Away |
| argentina-2026-27-player | Home | Home | Home |
| france-2026-27-player | Home | Home | Home |

## Verification

- 10 regression tests cover admin-visible disabled variants, absent variants, zero-stock previews, sleeve changes, missing images, all-disabled products, and the actual homepage/detail selectors.
- Full test suite: 9 files, 38 tests passed.
- ESLint, TypeScript and production build passed.
- Browser checks: Arsenal Third disabled on the homepage, Home/Away selectable on the short sleeve detail page, long sleeve selection falls back to Home, and missing back images cannot be selected.
- Authenticated behavior was tested using representative admin responses in the component tests; no live admin sign-in was performed.
