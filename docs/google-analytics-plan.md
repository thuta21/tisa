# Google Analytics plan for TISA

Status: proposed configuration only. Google Analytics is not installed or enabled
by this document. A GA4 web-stream measurement ID and the agreed privacy choices
are needed before implementation.

## Account setup

1. In [Google Analytics](https://analytics.google.com/), create or choose the
   business-owned account and a GA4 property named TISA. Set the reporting time
   zone to United Arab Emirates and the currency to AED for this store.
2. Create a Web data stream for the final production domain. Copy its measurement
   ID (`G-…`) from Admin → Data streams → the Web stream. This public identifier
   is sufficient for browser tagging; do not share an account password or a
   Measurement Protocol API secret.
3. Start with automatic outbound-click, form-interaction and site-search
   measurement disabled. Prefer explicit, sanitized page views and store events;
   disable history-based automatic page views if manual SPA navigation tracking
   is implemented, to avoid duplicate views.
4. Enable email data redaction and redact sensitive query parameters, especially
   `text`, `phone`, `email`, `name`, `code`, `token`, `access_token`, `refresh_token`
   and `next`. Redaction is a secondary safeguard; remove private data before
   events are sent.
5. Start without advertising features or Google signals. Agree on the site's
   consent behavior and privacy notice before enabling analytics collection.

## Recommended implementation

Use the Google tag directly for the current scope. Tag Manager can be considered
later if the business needs several independently managed marketing tags.

- Add a validated `NEXT_PUBLIC_GA_MEASUREMENT_ID` deployment variable when the
  integration exists. An absent ID should leave tracking disabled. Enable it only
  on the production storefront; previews and localhost should not pollute reports.
- Keep admin, account, login, registration, recovery and auth callback activity
  outside tracking. Handle client-side navigation into and out of these routes,
  rather than assuming a script in the root layout disappears on navigation.
- Use explicit storefront page views with sanitized locations and referrers.
  Never include auth tokens, profile information or arbitrary query strings.
- Preserve the existing nonce CSP. Pass the nonce to the Google tag and permit
  only the additional Analytics connections required for the chosen features.
  Do not add `unsafe-inline` or `unsafe-eval` to production script policy.
- If using an opt-in model, do not load the tag or send collection requests until
  consent. Provide a way to change the preference. Confirm the final behavior
  against the applicable business requirements before implementation.

| Event | Trigger | Allowed context |
| --- | --- | --- |
| `page_view` | Public storefront navigation | Sanitized page path and title |
| `view_item` | Product detail displayed | Product/variant ID, name, price, AED |
| `whatsapp_order_click` | Order preparation succeeds, just before opening WhatsApp | Product/variant ID, size, quantity, subtotal, AED |

The WhatsApp event measures a handoff attempt, not a confirmed sale or a sent
message. Mark it as a key event if enquiry reporting is the goal. Do not emit
`purchase` merely because a visitor opens WhatsApp; confirmed purchases need a
separate, deduplicated source of truth.

Never send customer names, phone numbers, emails, addresses, free-text messages,
auth tokens or the generated WhatsApp URL to Analytics. Automatic outbound-click
measurement includes `link_url`; the current `wa.me` URL contains a prefilled
message with customer information, so unrestricted automatic click tracking is
unsuitable here.

## Verification before enabling collection

- Use DebugView and Realtime to confirm one page view per storefront navigation
  and one handoff event per successful preparation.
- Check that event payloads contain only the documented fields, including on the
  fallback WhatsApp link. Inspect location and referrer parameters too.
- Verify account/admin/auth routes, refused consent, previews and local builds
  produce no tracking. Check denied-to-granted consent and withdrawal behavior.
- Test product navigation and the WhatsApp handoff with the nonce CSP active.

## Official references

- [Find a GA4 measurement ID](https://support.google.com/analytics/answer/12270356)
- [Enhanced measurement and collected parameters](https://support.google.com/analytics/answer/9216061)
- [Avoid personally identifiable information](https://support.google.com/analytics/answer/6366371)
- [Configure data redaction](https://support.google.com/analytics/answer/13544947)
- [Google tag content security policy](https://developers.google.com/tag-platform/security/guides/csp)
- [Ecommerce event setup and verification](https://support.google.com/analytics/answer/12200568)
