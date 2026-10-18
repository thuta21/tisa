# TISA Sportwears

TISA is a Next.js storefront for football jerseys and name-and-number fonts. It uses Supabase for catalog data, inventory, orders, authentication and admin access.

The current domain boundaries, transaction rules and clean-rebuild sequence are documented in [`docs/commerce-architecture.md`](docs/commerce-architecture.md).

## Requirements

- Node.js 20+
- pnpm 10+
- A Supabase project

## Local setup

The public website currently runs as a collection preview. Cart, checkout,
customer registration, accounts, fonts and public pricelists show an ordering
unavailable notice. Prices, purchase controls and delivery/payment promises are
removed from the public collection. Admin catalog and inventory tools remain
available at `/admin/login`.

Apply `supabase/migrations/20261008120000_pause_public_checkout.sql` to the
connected hosted project before deploying this preview. It revokes customer
access to `create_checkout_order`, including direct Supabase calls from old
clients, without changing existing records or admin order-management access.
The application publishable key cannot apply this migration; use a trusted
Supabase SQL Editor or authenticated database migration workflow. Reopening
orders requires an explicit database grant and restoring the storefront UI
after licensing and operational review.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

Set these values in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=false
NEXT_PUBLIC_SUPPORT_EMAIL=
NEXT_PUBLIC_WHATSAPP_NUMBER=
NEXT_PUBLIC_FACEBOOK_PAGE_URL=
NEXT_PUBLIC_CONTACT_PHONE=
RAG_WORKER_SECRET=replace-with-a-long-random-secret
```

`NEXT_PUBLIC_*` values are included in the browser bundle by Next.js. Do not place a Supabase service-role key or any other secret in them.

## Database and storage

Apply every SQL file in `supabase/migrations/` to the same Supabase project, in filename order. For a local Supabase stack:

```bash
pnpm supabase:start
npx supabase db reset
```

For a hosted project, use the Supabase CLI migration workflow or run the migrations through the SQL Editor in filename order. The latest customer-account migrations are:

- `20260711120000_create_customer_profiles.sql`
- `20260711130000_add_customer_order_profiles.sql`
- `20260813170000_secure_transactional_checkout.sql`

The inventory and catalog-search migrations are:

- `20260906180000_inventory_transactions.sql`
- `20260906181000_inventory_imports.sql`
- `20260906182000_catalog_transactions.sql`
- `20260906183000_catalog_knowledge.sql`
- `20260909160000_order_records_backup.sql`
- `20260909170000_commerce_rebuild_workflow.sql`
- `20260909180000_order_transactions.sql`
- `20260909190000_catalog_lifecycle.sql`

They add optimistic inventory versions, immutable stock movements, idempotent and atomic imports, protected product archival, and the pgvector catalog index. Apply all four together before deploying the matching admin UI.

The schema provisions the `product-images` and `payment-proofs` storage buckets. Create the initial catalog, inventory, payment methods and admin user before accepting orders.

## Authentication

Customer sign-up, email confirmation, email/password login, Google OAuth and password reset use Supabase Auth.

In Supabase Auth URL Configuration, add both of these redirect URLs:

```text
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
```

Enable Email auth. To enable Google sign-in, configure the Google provider in Supabase, register the Supabase provider callback URL in Google Cloud, and set `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true`. Keep it `false` until the provider is ready so the storefront does not show a broken button.

Checkout uses the `create_checkout_order` database function. Prices and stock are revalidated inside one database transaction; clients cannot directly create orders or choose trusted prices. Apply `20260813170000_secure_transactional_checkout.sql` before deploying the matching storefront code.

New sign-ups receive a customer profile automatically. Promote only trusted users to admin in the Supabase SQL Editor:

```sql
insert into public.profiles (id, display_name, role)
select id, coalesce(raw_user_meta_data ->> 'display_name', 'TISA Admin'), 'admin'::public.app_role
from auth.users
where email = 'tisasportwears26@gmail.com'
on conflict (id) do update set role = 'admin'::public.app_role;
```

Customers use `/register` and `/login`; admins use `/admin/login`. A customer can only view orders placed while logged into that account, at `/account`.

## Inventory and Excel operations

The Admin Inventory workspace reads and writes stock through authenticated server routes. Each adjustment requires the version shown to the editor, so a checkout or another admin update cannot be silently overwritten. Product metadata saves preserve stock. Existing orders keep their product and variant IDs, and an order-referenced catalog row must be archived instead of deleted.

The importer accepts the standard inventory export and the source `Stock Balance` layout with `Item Name`, `S`, `M`, `L`, `XL`, `XXL`, and `Balance Qty`. `XXL` maps to `2XL`; a blank stock cell leaves the current value unchanged, while an explicit zero sets it to zero. Preview the parsed rows and reconciliation issues in Admin, then commit the batch. Product creation and stock updates run in one database transaction and a repeated file/commit cannot apply the balance twice.

Unknown source items are created as draft products with zero price and unassigned catalog metadata. Complete their league, season, price, images, and variant details before publishing. Long-sleeve items remain separate products. Import undo creates compensating stock movements and refuses to overwrite inventory that changed after the import.

The generated source reconciliation workbook is at `outputs/inventory-architecture-20260909/TISA_Stock_Balance_Import_2026-09-09.xlsx`. Its `Inventory` sheet is directly importable; `Products to Create` lists the draft catalog records that need enrichment.

For a clean rebuild, use **Admin → Data Migration** and keep the generated JSON backup outside Supabase. The guarded sequence is:

1. Create and download the order backup. The database stores its hash and source counts.
2. Enter `CLEAN TISA DATA`. Cleaning is refused if any order record changed after the backup.
3. Download and import the product workbook. `sleeve` is required as `short` or `long`; stock columns are intentionally excluded.
4. After products exist, download and import the inventory workbook generated with their stable variant IDs.
5. Restore orders and payment records. Variant references are matched by original ID, SKU, or product slug + sleeve + kit, and the authoritative inventory balance is not deducted again.

The clean operation replaces products, variants, inventory, orders, payment proofs and their audit/import data, and deletes every Auth/profile account except the admin who starts the rebuild. It retains leagues, teams, seasons, sizes, fonts, payment-method configuration and Storage objects. Payment-proof files remain in the private Storage bucket; export that bucket separately before a full infrastructure reset.

## Catalog knowledge and RAG

Catalog text is queued for asynchronous indexing in Supabase Postgres with pgvector. Deploy the Edge Function and set the same secret on the function and the application environment:

```bash
npx supabase secrets set RAG_WORKER_SECRET=replace-with-a-long-random-secret
npx supabase functions deploy catalog-knowledge --no-verify-jwt
```

Invoke the function on a schedule or after an admin reindex request with the `x-worker-secret` header. The current worker uses Supabase `gte-small` embeddings with 384 dimensions. It is a provider boundary for later multilingual migration; exact SKU/alias and database keyword matching remain available when Burmese semantic recall is weak.

`GET /api/catalog/search?q=...` combines exact/keyword and vector results, then reads current product price and size availability from the transactional tables. Stock is never answered from embedded text. RLS and query filters exclude draft or archived products, and orders, customer contacts, and payment proofs are not indexed.

## Quality checks

```bash
pnpm lint
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

The suite covers cart identity, source workbook parsing, Excel round trips, optimistic stock conflicts, idempotent adjustments, atomic import rollback, stock restoration, protected order references, and catalog retrieval permissions.

The UI uses a local browser/system sans-serif font stack, so production builds do not fetch Google Fonts.

## Deployment

1. Configure the environment variables from `.env.example` in the hosting provider.
2. Apply pending Supabase migrations before deploying code that relies on them.
3. Add the production `/auth/callback` URL in Supabase Auth.
4. Run `pnpm lint`, `pnpm test`, `pnpm exec tsc --noEmit` and `pnpm build` in CI.
5. Deploy with `pnpm build` and `pnpm start`, or connect the repository to a Next.js-compatible host such as Vercel.

## Operations runbook

- **New products:** use the Admin Panel to add product variants, images, sizes and inventory. Verify stock by size before publishing.
- **Orders:** review incoming orders in Admin, verify the payment method/proof, then update the order and delivery status. Cancelling or rejecting an order releases tracked inventory.
- **Order backups:** use **Backup JSON** in Admin Orders after applying `20260909160000_order_records_backup.sql`. It exports a consistent admin-only snapshot of orders, items, payment proof metadata, status history and payment-method references. Back up the private `payment-proofs` storage bucket separately when the uploaded files are also required.
- **Low stock:** check the Admin inventory view before campaigns and replenish the exact variant/size combination.
- **Imports:** use preview first, resolve every blocking row/cell issue, commit once, then retain the reconciliation report and import batch ID.
- **Knowledge index:** check the Admin index counts; retry failed jobs or request a full reindex after changing the embedding model.
- **Support:** configure verified support email and WhatsApp values before publishing contact channels.
- **Access:** grant or revoke admin role only from a trusted Supabase administrator workflow; never expose role assignment in the storefront.

## Project commands

```bash
pnpm dev              # local development
pnpm lint             # ESLint
pnpm test             # non-watch Vitest suite
pnpm test:watch       # Vitest watch mode
pnpm build            # production build
pnpm supabase:start   # local Supabase stack
pnpm supabase:stop    # stop local Supabase stack
pnpm supabase:types   # refresh local generated database types
```

## Public collection rendering and SEO

Home, collection and jersey detail pages render their initial catalog on the server,
with route skeletons during loading. Public preview queries omit prices and
size-level inventory; commerce and admin queries keep their existing data.
Product metadata and page rendering share one request-scoped lookup.

Set `NEXT_PUBLIC_SITE_URL` to the public production origin (for example,
`https://your-production-domain.com`) before deployment. This configures absolute
canonical/share URLs and `/sitemap.xml`. Without it, the sitemap stays empty
instead of publishing an invented production hostname. `/robots.txt` excludes
admin, API and account/checkout utility routes. Product links include their own
title, description and jersey image; other pages have a TISA sharing image.

## Admin Marketing Studio

Open **Admin → Marketing** (`/admin/marketing`), or **Create content** beside a
product. This workspace reads descriptive catalog data only; it does not load
orders, payments or size-level inventory. It creates exportable content, not
social-platform posts. No Facebook/TikTok tokens or scheduler subscription are
required in this version.

### Setup and deployment

1. Apply `supabase/migrations/20261018120000_marketing_studio.sql` through the
   authenticated Supabase migration workflow. This adds three admin-only tables,
   transactional job leases and the private `marketing-assets` bucket. The
   publishable application key cannot apply schema migrations. Missing tables
   produce a setup notice without breaking the rest of Admin.
2. Set `NEXT_PUBLIC_SITE_URL` to the real public production origin. Without it,
   captions and exports still work, with a notice and no invented product link.
3. Optionally set **server-only** `OPENAI_API_KEY`, `OPENAI_MARKETING_MODEL`
   (default `gpt-6-luna`) and `OPENAI_MARKETING_DAILY_LIMIT` (default 20 per admin
   per UTC day; maximum 100). Configure an accessible model in your OpenAI
   project. Keys are never entered into the editor or included in the browser
   bundle. Templates and rendering work without OpenAI. AI generation happens
   only when requested and reserves quota even when the provider fails.
4. Deploy with Vercel's Node.js runtime and Fluid compute enabled. The render
   route uses `maxDuration=300`; FFmpeg is terminated after 240 seconds. The
   `ffmpeg-static` install script is explicitly permitted in pnpm workspace
   configuration. Install dependencies on the target build platform so the
   correct FFmpeg binary is downloaded; never copy macOS `node_modules` to Linux.
   `next.config.ts` includes the binary only in the dedicated render function.
5. On a **Vercel Preview deployment**, create a four-image draft, save, mark ready,
   and export the 12-second video. Confirm the generated function is below the
   platform's bundle limit, render finishes within its time limit, Storage upload
   succeeds, and the private signed download plays. Complete this check before
   deploying the feature to production. Local rendering does not establish
   Vercel deployment compatibility.

No separate rendering subscription is added. Video CPU time, Storage and
optional OpenAI calls still consume the associated provider quotas. Vercel
settings and hosted SQL migration require authenticated access to those services.

### Content workflow

Choose up to six active products to create independent drafts. Each draft freezes
its descriptive metadata and original images into private storage. Select 1–4
images, reorder them, choose a Burmese caption template, then edit the caption.
Comparison requires images from at least two enabled kits. Save changes and
explicitly **Mark ready** before exporting. Optional AI suggestions never replace
an edited caption until selected. AI receives descriptive product facts only,
not original descriptions, customer details, payment data, prices or stock.

Captions use a direct Burmese sales pitch: a fan-focused hook, selected kit and
season details, and an invitation to enquire about ordering through Page
Messenger, WhatsApp or phone. Configure the Facebook/Messenger page URL with
`NEXT_PUBLIC_FACEBOOK_PAGE_URL`, a country-code WhatsApp number with
`NEXT_PUBLIC_WHATSAPP_NUMBER` and the calling number with
`NEXT_PUBLIC_CONTACT_PHONE`. Only validated configured links/numbers are appended;
missing values produce a notice and are never replaced with dummy contact data.
Prices, stock, discounts, quality and delivery promises are never
invented. Existing saved captions stay as written; click **Use sales caption
template** to replace one explicitly. AI generation saves current edits first,
then presents three alternatives for review. With no server key, **Set up AI**
opens setup instructions; the sales templates work immediately without a key.
**Generate 3 captions · no AI** creates three distinct template options in the
browser from the selected tone and product facts, with no OpenAI request, job or
API quota usage. Choosing an option changes the editor; **Save draft** persists
it. It never replaces a manually written caption just by generating options.
For local setup put `OPENAI_API_KEY` in ignored `.env.local`, restart the dev
server and refresh Marketing. On Vercel, set it in the relevant environment and
redeploy. Never use a `NEXT_PUBLIC_` prefix for a secret API key.

The first image produces a **1080×1350 PNG**. Video requires 2–4 images and produces
a silent **720×1280 H.264/yuv420p MP4 at 24fps**, 9 seconds for two/three images and
12 seconds for four. Previews and exports use the same frame renderer. Product
photos and English product text are used; there is no AI image/video generation,
price, stock, purchase CTA, or automatic music licensing step. Add audio in your
social app when publishing.

Editing a draft increments its revision and requires review again. Refreshing
or replacing the product snapshot is explicit and keeps the caption for review.
Archived/deleted source products block new exports but previously saved exports
remain downloadable. Duplicate drafts get independent frozen image files.
Review and new exports also check that the selected kits are still enabled;
refresh the snapshot explicitly if a kit has been disabled.

One job may run per draft, coordinated by PostgreSQL across server instances.
Expired jobs can be retried; late results cannot overwrite a newer revision.
Completed exports are reusable, so repeated downloads do not rerender files.
Bulk export sends sequential requests while the page stays open; it is not a
background scheduler. Closing the page stops any requests not yet started.

Saved files live in private Storage. Download URLs expire after five minutes;
click Download again for a fresh URL. Depending on iOS/Android browser settings,
a download may open a media preview: use Share / Save to Files / Download to keep
it. Check both Safari on iOS and Chrome on Android during deployment QA.

The workspace shows recent job durations, errors and AI token usage. The recent
operations summary is limited to the latest 100 jobs; the draft detail shows the
latest 30. Archive is reversible and retains export files; monitor Storage usage
as the content library grows.

### Marketing checks

`pnpm exec vitest run tests/marketing-*.test.ts tests/marketing-workspace.test.tsx`
checks permissions, PostgreSQL leases/revisions/quota, content boundaries,
no-key editing, missing-migration behavior, actual PNG rendering and actual
four-scene MP4 encoding/decoding. Then run the standard lint, TypeScript, full
suite and production build checks above. Hosted migrations, live OpenAI access,
Vercel Preview performance and physical-device downloads need separate
integration verification; mocked UI tests are not evidence of those checks.

Implementation verification (2026-10-18): lint, TypeScript, all 80 Vitest tests
and the production build passed locally. The shared renderer produced a real
1080×1350 PNG and a four-scene 720×1280, 24fps, 12-second H.264/yuv420p MP4.
Local authenticated-service mocks were used for browser layout checks at 320px,
393px (phone preset), 768px and desktop; no hosted data was changed. Local route
traces contained FFmpeg only in the render route (81.1 MiB on macOS versus
37.6 MiB for the marketing API); Linux/Vercel bundle size must be checked separately.
The build's missing `metadataBase` warning reflects the unconfigured production
site origin. The hosted marketing migration was applied and its tables, RLS,
Storage policies, RPC access and migration history verified on 2026-10-18.
The Vercel four-image smoke test, live optional
OpenAI, exact 390px QA and physical iOS/Android downloads remain rollout gates.
