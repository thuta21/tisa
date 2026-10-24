# Security and admin fixes — 24 October 2026

This review covers the repository and database schema in its migrations. Applying
a migration locally does not change hosted Supabase settings. No claim of complete
security is made: hosted configuration, account security and deployment controls
must also be verified for the environment actually serving customers.

## Changes

- Updated Next.js 16.2.9 → 16.4.3 and sharp 0.34.5 → 0.35.5, with compatible React,
  Supabase and development dependency updates. Moved the shadcn generator to dev
  dependencies. The complete dependency audit currently reports zero known
  vulnerabilities. CI now runs an audit and generates route types before checking
  TypeScript. CI and `.nvmrc` target Node 24 LTS; development requires at least
  Node 22.12. Node 20 is no longer supported by this project.
- Added server authentication and current admin-role verification around every
  protected admin route. Login remains outside that route group. API handlers
  independently verify the current user and role; database RLS/RPC checks remain
  the final authorization layer. Client-supplied role metadata is not trusted.
- Use Secure, SameSite=Lax auth cookies in production. Fixed session-refresh cookie forwarding and preserved refreshed cookies on
  redirects. Auth/admin/API responses are private and not cacheable. Proxy
  matchers explicitly include admin/API paths even when they contain file suffixes.
- Replaced production inline-script permission with per-request CSP nonces.
  Framework scripts and JSON-LD receive the nonce. Supabase image, media and
  connection origins are limited to the configured project. Inline styles remain
  supported for React layout and animation. HTML pages now render dynamically,
  since a nonce must be unique per response. Added production HSTS and protected
  popup opener behavior.
- Refused secret/service-role keys in public Supabase configuration; external
  database URLs must use HTTPS. Only publishable or legacy anon keys belong in
  `NEXT_PUBLIC_*` variables.
- Require same-origin requests for cookie-authenticated mutations. Parse JSON
  and multipart requests through byte limits that also apply to chunked bodies;
  malformed JSON, unsupported content types and oversized bodies receive distinct
  errors. General admin API errors do not disclose raw database constraint values.
- Added ZIP structure checks and bounded actual decompression before Excel
  parsing, including checks for forged uncompressed sizes. Existing row and
  worksheet limits still apply.
- Restricted customer order reads to customer-facing columns. `admin_note`,
  checkout tokens, staff actors and internal history notes are excluded from
  direct customer access. Admins load full order data through `list_admin_orders`,
  which checks their role and paginates reads. Order export and transactional
  admin RPCs retain their permission checks.
- Reset explicit Supabase function grants, including grants directly inherited
  from hosted project defaults. Worker functions are service-role-only, private
  stock helpers are not callable by customers, public search remains available,
  admin RPCs still enforce roles, and old online checkout remains paused. New
  functions, tables and sequences require explicit API grants. Public schema creation is denied to API roles.
- Added shared database quotas: ten WhatsApp preparations per account/minute and
  thirty profile changes per account/minute. Customers cannot change quota rows
  or invoke the private quota helper with a different limit.

## Admin behavior

- Replaced datalist inputs that remounted while typing with Base UI comboboxes.
  League, Team and Season support search, keyboard selection, clearing and proper
  labels. Popups render above drawers instead of being clipped by scrolling.
- Teams are disabled until a league is selected. Changing league clears an
  incompatible team. Fixed product name/slug updates overwriting one another.
- Admin login return paths cannot point back to the login page and create a
  redirect loop.
- Settings navigation now toggles closed, closes on Escape/outside click and
  renders the mobile submenu outside the horizontally scrolling bar.
- Product and order editors trap focus, restore focus and page scrolling, handle
  Escape, display save errors inside the editor, and prevent duplicate submissions.
  Inputs and closing controls are disabled during saves/uploads.
- Reference lists still load when an unrelated admin query fails. Private font paths load through an admin-checked RPC; font loading
  errors are included in reporting. Refreshing data no longer erases success
  messages immediately.
- Product size selections persist in Postgres. Removed sizes are disabled,
  reselected sizes are enabled, and quantities and audit history are preserved.
  Quantity adjustments continue to require the Inventory workflow and a reason.

## Hosted deployment

1. Apply all missing repository migrations, in order, including
   `20261024120000_customer_whatsapp_ordering.sql` and
   `20261024140000_security_hardening.sql`, using the trusted SQL Editor or an
   authenticated Supabase CLI migration workflow. Do not reset the hosted database.
   The hardening migration resets custom function grants in `public` and `private`;
   review any manually created functions outside this repository before applying.
2. Deploy the application version that uses `list_admin_orders` and the enquiry
   quota RPC alongside the schema update. Old clients using `orders.select('*')`
   deliberately fail after internal-column access is revoked.
3. Check hosted Auth separately: email confirmation, minimum eight-character
   passwords, secure password change, exact callback redirect URLs, production
   SMTP, auth rate limits and leaked-password protection where supported. Local
   `supabase/config.toml` enables confirmation, eight-character passwords and a
   sixty-second email interval; editing it does not update hosted Auth.
4. Confirm the deployed environment contains only a publishable/anon key in the
   public key variable. Keep OpenAI, worker and service-role secrets server-side.
   If a secret was previously exposed, rotate it in its provider; removing it
   from source does not revoke it. No credential values are included in this report.
5. Use individual admin accounts and enable MFA in Supabase for operators. Do not
   enable an admin AAL2 enforcement rule before the application has an MFA challenge
   flow and operators are enrolled; this version does not enforce MFA itself.
6. Set deployment-level WAF/rate controls for public catalog search, font previews
   and authentication. The database quotas protect the specified authenticated
   actions, not all anonymous traffic or distributed volumetric attacks.
7. Check database backups/PITR, recovery access, logs, Storage bucket visibility
   and Supabase Security Advisor in the hosted dashboard. Payment proofs, fonts
   and marketing assets are private in the repository migrations.

## Evidence and limits

Final local verification: 25 test files / 118 tests passed; ESLint, TypeScript and
the production build passed. `pnpm audit` reported zero vulnerabilities at every
severity. These checks ran on the workstation's Node 25 runtime; CI targets Node
24 LTS. Hosted migration application remains pending Supabase CLI login.

Automated tests exercise default-grant cleanup, anonymous/customer/admin access,
private order columns, quota evasion, stock-preserving size changes, request size
and origin validation, key configuration, CSP and interactive admin controls.
Production browser checks verify that nonce CSP permits storefront hydration.
No real WhatsApp messages, payments or customer accounts are created for testing.
Dependency audit results are a snapshot and do not replace operational monitoring.

Primary guidance:

- [Next.js image optimization advisory and patched versions](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)
- [Supabase API grants and default privileges](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase function security](https://supabase.com/docs/guides/database/functions)
- [Supabase SSR cookie and session handling](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)
- [Base UI combobox documentation](https://base-ui.com/react/components/combobox)
- [Node.js supported release status](https://nodejs.org/en/about/previous-releases)
