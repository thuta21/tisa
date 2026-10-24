# Google Analytics for TISA

Implemented for GA4 measurement ID `G-HZEBCV1FMR`, Web stream `16194158656`.
The stream number is account metadata; browser tagging uses the `G-…` ID.
The owner confirmed on 24 October 2026 that automatic browser-history page views,
outbound clicks, site search and form interactions were switched off in GA4.

Analytics is opt-in. Google receives no tag request or measurement event until
this browser chooses **Allow analytics**. The footer's **Analytics preferences**
button lets visitors change that choice. Consent is remembered for 180 days.
On withdrawal, Analytics cookies are cleared and the document reloads to dispose
of Google's timers and listeners.

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

## Implementation

The application loads the Google tag directly, with the existing response nonce.
`AnalyticsProvider` manages consent and navigation; `lib/analytics.ts` builds
allowlisted payloads. It uses the public measurement ID above by default.

`NEXT_PUBLIC_GA_MEASUREMENT_ID` can override that public ID. Set it to an empty
string to disable Analytics. Collection requires `VERCEL_ENV=production`, a valid
ID, explicit consent, an allowed storefront path and a browser origin matching
`NEXT_PUBLIC_SITE_URL` (default `https://tisa-iota.vercel.app`). Localhost and
Preview builds do not collect measurements. No new deployment secret is needed.

- Account, admin, login, registration, recovery and callback routes are excluded.
  A client navigation from an active Analytics session into a private route
  disables collection and reloads into a fresh document without the Google tag.
- Page views contain only an allowlisted public path; queries and fragments are
  omitted. Initial referrers are reduced to their HTTPS origin, while subsequent
  storefront referrers use the previously measured sanitized path. Page titles
  use the fixed public label TISA. Duplicate initial/history views are avoided.
- Product views are deduplicated for the current route and variant. The order
  handoff waits for the event callback with a 700 ms maximum fallback, so an ad
  blocker or slow Google connection cannot stop WhatsApp navigation.
- Google signals and ad personalization are disabled in the configuration; ad
  storage, ad user data and ad personalization consent remain denied.
- The script carries the CSP nonce. Analytics connection/image endpoints are
  permitted without adding `unsafe-inline` or `unsafe-eval` to script policy.

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
unsuitable here. The fallback control now uses a button and keeps the private
WhatsApp URL out of link attributes.

## Verification

Automated tests cover opt-in, denial, expiry, unavailable storage, private-route
exclusion, origin/production gating, nonce loading, deduplication, safe payloads,
cookie removal and the bounded handoff wait.

Account-side verification still requires the owner to view Google Analytics:

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
