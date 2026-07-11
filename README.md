# TISA Sportwears

TISA is a Next.js storefront for football jerseys and name-and-number fonts. It uses Supabase for catalog data, inventory, orders, authentication and admin access.

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
NEXT_PUBLIC_SUPPORT_EMAIL=
NEXT_PUBLIC_WHATSAPP_NUMBER=
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

The schema provisions the `product-images` and `payment-proofs` storage buckets. Create the initial catalog, inventory, payment methods and admin user before accepting orders.

## Authentication

Customer sign-up, email confirmation, email/password login, Google OAuth and password reset use Supabase Auth.

In Supabase Auth URL Configuration, add both of these redirect URLs:

```text
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
```

Enable Email auth. To enable Google sign-in, configure the Google provider in Supabase and register the Supabase provider callback URL in Google Cloud.

New sign-ups receive a customer profile automatically. Promote only trusted users to admin in the Supabase SQL Editor:

```sql
insert into public.profiles (id, display_name, role)
select id, coalesce(raw_user_meta_data ->> 'display_name', 'TISA Admin'), 'admin'::public.app_role
from auth.users
where email = 'tisasportwears26@gmail.com'
on conflict (id) do update set role = 'admin'::public.app_role;
```

Customers use `/register` and `/login`; admins use `/admin/login`. A customer can only view orders placed while logged into that account, at `/account`.

## Quality checks

```bash
pnpm lint
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

The unit suite currently protects cart identity behavior. Add a regression test whenever cart, pricing, authentication or order-state logic changes.

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
- **Low stock:** check the Admin inventory view before campaigns and replenish the exact variant/size combination.
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
