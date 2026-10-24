"use client";

import { isAnalyticsPath, type AnalyticsConfig } from "@/lib/analytics-config";

export const CONSENT_KEY = "tisa-analytics-consent-v1";
export const CONSENT_EVENT = "tisa:analytics-consent";
export const ANALYTICS_READY_EVENT = "tisa:analytics-ready";
export type AnalyticsConsent = "granted" | "denied" | null;
type GoogleWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
type Runtime = { config: AnalyticsConfig; path: string | null; product: string | null; referrer: string };
let runtime: Runtime | null = null;

export function getAnalyticsConsent(): AnalyticsConsent {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CONSENT_KEY) ?? "null");
    if (saved && (saved.choice === "granted" || saved.choice === "denied") && Number.isFinite(saved.savedAt)
      && saved.savedAt <= Date.now() && Date.now() - saved.savedAt < 180 * 86400000) return saved.choice;
  } catch { /* Unavailable storage or an invalid choice never implies consent. */ }
  return null;
}

export function saveAnalyticsConsent(choice: Exclude<AnalyticsConsent, null>) {
  try { window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, savedAt: Date.now() })); } catch {
    if (choice === "denied") { try { window.localStorage.removeItem(CONSENT_KEY); } catch { /* Keep the runtime disabled. */ } }
    return false;
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
  return true;
}

function setDisabled(id: string, disabled: boolean) {
  (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = disabled;
}

export function pauseAnalytics() {
  if (runtime) { setDisabled(runtime.config.measurementId, true); runtime.path = null; runtime.product = null; }
}

export function hasAnalyticsStarted() { return runtime !== null; }

export function clearAnalyticsCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.trim().split("=")[0];
    if (!/^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name)) continue;
    for (const domain of ["", window.location.hostname, `.${window.location.hostname}`]) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}${window.location.protocol === "https:" ? "; Secure" : ""}`;
    }
  }
}

function currentPath() {
  const path = window.location.pathname;
  return isAnalyticsPath(path) ? path : null;
}

function canSend() {
  return runtime && runtime.config.enabled && window.location.origin === runtime.config.origin
    && getAnalyticsConsent() === "granted" && currentPath();
}

function safeReferrer() {
  try { const url = new URL(document.referrer); return url.protocol === "https:" ? url.origin : ""; } catch { return ""; }
}

function pageParameters(path: string) {
  return { page_location: `${runtime!.config.origin}${path}`, page_referrer: runtime!.referrer, page_title: "TISA" };
}

export function startAnalytics(config: AnalyticsConfig, nonce: string | undefined) {
  if (!config.enabled || !nonce || window.location.origin !== config.origin || !currentPath() || getAnalyticsConsent() !== "granted") return false;
  const google = window as GoogleWindow;
  setDisabled(config.measurementId, false);
  if (!runtime) {
    runtime = { config, path: null, product: null, referrer: safeReferrer() };
    google.dataLayer = google.dataLayer || [];
    // The Google tag expects Arguments objects, as in Google's supplied snippet.
    // eslint-disable-next-line prefer-rest-params -- Match Google's documented Arguments-based queue protocol.
    google.gtag = function () { google.dataLayer!.push(arguments); };
    google.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    google.gtag("js", new Date());
    google.gtag("config", config.measurementId, {
      send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_domain: window.location.hostname, cookie_flags: "SameSite=Lax;Secure",
      ...pageParameters(window.location.pathname),
    });
    const script = document.createElement("script");
    script.id = "tisa-google-analytics";
    script.async = true;
    script.nonce = nonce;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`;
    document.head.appendChild(script);
  }
  trackPageView();
  window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
  return true;
}

export function trackPageView() {
  const path = canSend();
  if (!path || runtime!.path === path) return;
  if (runtime!.path) runtime!.referrer = `${runtime!.config.origin}${runtime!.path}`;
  runtime!.path = path;
  runtime!.product = null;
  const google = window as GoogleWindow;
  google.gtag?.("set", pageParameters(path));
  google.gtag?.("event", "page_view", { ...pageParameters(path), send_to: runtime!.config.measurementId });
}

export type AnalyticsProduct = { itemId: string; name: string; variant?: string | null; price: number; size?: string; quantity?: number };

export function trackProductEvent(event: "view_item" | "whatsapp_order_click", product: AnalyticsProduct, onComplete?: () => void) {
  const path = canSend();
  if (!path || !product.itemId || !Number.isFinite(product.price) || product.price < 0) return false;
  const quantity = product.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return false;
  trackPageView();
  const key = `${path}:${product.itemId}:${product.variant ?? ""}`;
  if (event === "view_item" && runtime!.product === key) return false;
  if (event === "view_item") runtime!.product = key;
  let completed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const complete = () => {
    if (completed) return;
    completed = true;
    if (timer) clearTimeout(timer);
    onComplete?.();
  };
  // Never hold up an enquiry if Google is blocked or slow.
  if (onComplete) timer = setTimeout(complete, 700);
  // Build the payload explicitly: never spread a form, response or WhatsApp URL.
  try { (window as GoogleWindow).gtag?.("event", event, {
    ...pageParameters(path), send_to: runtime!.config.measurementId, currency: "AED", value: product.price * quantity,
    ...(onComplete ? { event_callback: complete, event_timeout: 500 } : {}),
    items: [{ item_id: product.itemId.slice(0, 100), item_name: product.name.slice(0, 100),
      ...(product.variant ? { item_variant: product.variant.slice(0, 40) } : {}),
      ...(product.size ? { item_size: product.size.slice(0, 20) } : {}), price: product.price, quantity }],
  }); } catch { complete(); }
  return true;
}

export function trackWhatsAppHandoff(product: AnalyticsProduct) {
  return new Promise<void>(resolve => {
    if (!trackProductEvent("whatsapp_order_click", product, resolve)) resolve();
  });
}
