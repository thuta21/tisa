export function contentSecurityPolicy(nonce: string, supabaseUrl: string, development: boolean) {
  const origin = new URL(supabaseUrl).origin;
  const socketOrigin = origin.replace(/^http/, "ws");
  return [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", `img-src 'self' data: blob: ${origin} https://www.googletagmanager.com https://*.google-analytics.com`,
    `media-src 'self' blob: ${origin}`, "font-src 'self' data:", `connect-src 'self' ${origin} ${socketOrigin} https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com`,
  ].join("; ");
}
