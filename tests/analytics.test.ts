// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://tisa.test"}
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAnalyticsConfig, isAnalyticsPath, type AnalyticsConfig } from "@/lib/analytics-config";

const config: AnalyticsConfig = { enabled: true, measurementId: "G-HZEBCV1FMR", origin: "https://tisa.test" };
let analytics: typeof import("@/lib/analytics");
function commands() { return ((window as unknown as {dataLayer: ArrayLike<unknown>[]}).dataLayer ?? []).map(value => Array.from(value)); }
afterEach(() => vi.useRealTimers());
beforeEach(async () => {
  vi.resetModules();
  // Node 25 exposes an incomplete native localStorage in the test global.
  // Keep browser storage deterministic across Node 24 CI and local Node 25.
  const storage = new Map<string, string>();
  Object.defineProperty(window, "localStorage", { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
    clear: () => storage.clear(),
  } });
  window.localStorage.clear();
  document.head.innerHTML = "";
  window.history.replaceState({}, "", "/shop?email=private@example.com&token=secret#private");
  delete (window as unknown as Record<string, unknown>).dataLayer;
  delete (window as unknown as Record<string, unknown>).gtag;
  analytics = await import("@/lib/analytics");
});

describe("production Analytics configuration", () => {
  it("enables the supplied public ID only for production, and supports an explicit off switch", () => {
    expect(getAnalyticsConfig({ VERCEL_ENV: "production" }).enabled).toBe(true);
    expect(getAnalyticsConfig({ VERCEL_ENV: "preview" }).enabled).toBe(false);
    expect(getAnalyticsConfig({ NODE_ENV: "production" }).enabled).toBe(false);
    expect(getAnalyticsConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_GA_MEASUREMENT_ID: "" }).enabled).toBe(false);
    expect(getAnalyticsConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-evil<script>" }).enabled).toBe(false);
    expect(getAnalyticsConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "http://tisa.test" }).enabled).toBe(false);
  });
  it("excludes private paths, arbitrary URLs and query strings", () => {
    for (const path of ["/", "/shop", "/jersey/germany-2026-27-player", "/privacy"]) expect(isAnalyticsPath(path)).toBe(true);
    for (const path of ["/admin", "/admin/orders", "/account", "/auth/callback", "/login", "/register", "/reset-password", "/checkout", "/api/orders", "/shop?token=secret", "https://evil.test"]) expect(isAnalyticsPath(path)).toBe(false);
  });
});

describe("consent and Analytics payloads", () => {
  it("does not load the tag or queue events before consent, after denial or after expiry", () => {
    expect(analytics.startAnalytics(config, "nonce")).toBe(false);
    analytics.saveAnalyticsConsent("denied");
    expect(analytics.startAnalytics(config, "nonce")).toBe(false);
    window.localStorage.setItem(analytics.CONSENT_KEY, JSON.stringify({ choice: "granted", savedAt: Date.now() - 181 * 86400000 }));
    expect(analytics.getAnalyticsConsent()).toBeNull();
    expect(analytics.startAnalytics(config, "nonce")).toBe(false);
    expect(document.querySelector("script")).toBeNull();
    expect(commands()).toEqual([]);
  });
  it("loads once with the CSP nonce and sanitizes page URLs without duplicate route views", () => {
    analytics.saveAnalyticsConsent("granted");
    expect(analytics.startAnalytics(config, "nonce-123")).toBe(true);
    expect(analytics.startAnalytics(config, "nonce-123")).toBe(true);
    const tag = document.querySelector("script")!;
    expect(tag.nonce).toBe("nonce-123");
    expect(tag.src).toBe("https://www.googletagmanager.com/gtag/js?id=G-HZEBCV1FMR");
    expect(document.querySelectorAll("script")).toHaveLength(1);
    expect(commands().find(c => c[0] === "config")?.[2]).toMatchObject({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    expect(commands().filter(c => c[1] === "page_view")).toHaveLength(1);
    expect(JSON.stringify(commands())).not.toMatch(/private@example|token|secret|#private/);
    window.history.replaceState({}, "", "/shop?search=new");
    analytics.trackPageView();
    expect(commands().filter(c => c[1] === "page_view")).toHaveLength(1);
    window.history.replaceState({}, "", "/jersey/germany-2026-27-player?phone=private");
    analytics.trackPageView();
    expect(commands().filter(c => c[1] === "page_view")).toHaveLength(2);
  });
  it("requires nonce, configured production origin and a public page even after consent", () => {
    analytics.saveAnalyticsConsent("granted");
    expect(analytics.startAnalytics(config, undefined)).toBe(false);
    expect(analytics.startAnalytics({ ...config, origin: "https://another.test" }, "nonce")).toBe(false);
    window.history.replaceState({}, "", "/account?token=private");
    expect(analytics.startAnalytics(config, "nonce")).toBe(false);
    expect(commands()).toEqual([]);
  });
  it("sends only allowlisted product data and treats WhatsApp as an enquiry, not a purchase", () => {
    analytics.saveAnalyticsConsent("granted");
    analytics.startAnalytics(config, "nonce");
    const product = { itemId: "variant-1", name: "Germany Jersey", variant: "home", price: 65, size: "M", quantity: 2,
      customerName: "PRIVATE NAME", customerPhone: "+971501234567", url: "https://wa.me/971501234567?text=PRIVATE" };
    analytics.trackProductEvent("view_item", product);
    analytics.trackProductEvent("view_item", product);
    analytics.trackProductEvent("whatsapp_order_click", product);
    const events = commands().filter(c => c[0] === "event");
    expect(events.map(c => c[1])).toEqual(["page_view", "view_item", "whatsapp_order_click"]);
    expect(events[2][2]).toMatchObject({ currency: "AED", value: 130, items: [{ item_id: "variant-1", item_size: "M", quantity: 2, price: 65 }] });
    expect(JSON.stringify(events)).not.toMatch(/PRIVATE|971501234567|wa.me|purchase/);
  });
  it("stops sending immediately on private navigation or consent withdrawal", () => {
    analytics.saveAnalyticsConsent("granted");
    analytics.startAnalytics(config, "nonce");
    const count = commands().length;
    window.history.replaceState({}, "", "/admin/orders?phone=private");
    analytics.trackPageView();
    analytics.trackProductEvent("whatsapp_order_click", { itemId: "x", name: "Jersey", price: 65 });
    expect(commands()).toHaveLength(count);
    window.history.replaceState({}, "", "/shop");
    analytics.saveAnalyticsConsent("denied");
    analytics.pauseAnalytics();
    analytics.trackPageView();
    expect(commands()).toHaveLength(count);
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-HZEBCV1FMR"]).toBe(true);
  });
  it("clears analytics cookies while preserving unrelated cookies", () => {
    document.cookie = "_ga=test; Path=/; Secure";
    document.cookie = "_ga_HZEBCV1FMR=test; Path=/; Secure";
    document.cookie = "other-session=keep; Path=/; Secure";
    analytics.clearAnalyticsCookies();
    expect(document.cookie).not.toContain("_ga=");
    expect(document.cookie).not.toContain("_ga_HZEBCV1FMR=");
    expect(document.cookie).toContain("other-session=keep");
  });
  it("allows the WhatsApp handoff after a bounded wait when Google is blocked", async () => {
    vi.useFakeTimers();
    analytics.saveAnalyticsConsent("granted");
    analytics.startAnalytics(config, "nonce");
    const done = vi.fn();
    const pending = analytics.trackWhatsAppHandoff({ itemId: "variant-1", name: "Jersey", price: 65 }).then(done);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(700);
    await pending;
    expect(done).toHaveBeenCalledOnce();
  });
  it("keeps tracking off when browser storage cannot save consent", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    expect(analytics.saveAnalyticsConsent("granted")).toBe(false);
    expect(analytics.startAnalytics(config, "nonce")).toBe(false);
    expect(document.querySelector("script")).toBeNull();
  });
});
