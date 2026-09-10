# TISA Sportwears

TISA is a Next.js storefront for football jerseys and name-and-number fonts. It uses Supabase for catalog data, inventory, orders, authentication and admin access.

The current domain boundaries, transaction rules and clean-rebuild sequence are documented in [`docs/commerce-architecture.md`](docs/commerce-architecture.md).

## Requirements

- Node.js 20+
- pnpm 10+
- A Supabase project

## Local setup

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
