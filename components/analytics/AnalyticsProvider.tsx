"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAnalyticsPath, type AnalyticsConfig } from "@/lib/analytics-config";
import { clearAnalyticsCookies, CONSENT_EVENT, getAnalyticsConsent, hasAnalyticsStarted, pauseAnalytics, saveAnalyticsConsent, startAnalytics } from "@/lib/analytics";

const PreferencesContext = createContext<(() => void) | null>(null);
const serverConsent = () => null;
function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  window.addEventListener("focus", onChange);
  return () => { window.removeEventListener(CONSENT_EVENT, onChange); window.removeEventListener("storage", onChange); window.removeEventListener("focus", onChange); };
}

export default function AnalyticsProvider({ config, nonce, children }: { config: AnalyticsConfig; nonce?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribe, getAnalyticsConsent, serverConsent);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const publicPage = isAnalyticsPath(pathname);

  useEffect(() => {
    if (!config.enabled) return;
    if (consent === "granted" && publicPage && !storageError) { startAnalytics(config, nonce); return; }
    pauseAnalytics();
    // Dispose Google's listeners and timers when leaving the public storefront
    // or withdrawing consent. The fresh private document never loads the tag.
    if (hasAnalyticsStarted()) {
      if (consent !== "granted") clearAnalyticsCookies();
      window.location.reload();
    }
  }, [config, nonce, pathname, publicPage, consent, storageError]);

  useEffect(() => {
    if (!config.enabled) return;
    const beforeNavigation = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link || link.getAttribute("target") === "_blank") return;
      const url = new URL(link.getAttribute("href")!, window.location.href);
      if (url.origin === window.location.origin && !isAnalyticsPath(url.pathname)) pauseAnalytics();
    };
    document.addEventListener("click", beforeNavigation, true);
    return () => document.removeEventListener("click", beforeNavigation, true);
  }, [config.enabled]);

  function choose(choice: "granted" | "denied") {
    if (choice === "denied") pauseAnalytics();
    if (!saveAnalyticsConsent(choice)) { setStorageError(true); return; }
    setStorageError(false);
    setPreferencesOpen(false);
  }

  return <PreferencesContext.Provider value={config.enabled ? () => setPreferencesOpen(true) : null}>
    {children}
    {config.enabled && publicPage && (consent === null || preferencesOpen) && <section aria-label="Analytics preferences" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-border bg-background p-5 text-foreground shadow-xl sm:bottom-5 sm:p-6">
      <h2 className="text-base font-semibold">Your analytics choice</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Allow Google Analytics to help us understand visits, product views and WhatsApp order enquiries. We keep customer names, phone numbers and messages out of our analytics events. Your account and ordering work with either choice. <Link href="/privacy" className="font-medium text-primary underline">Privacy details</Link></p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => choose("denied")} className="min-h-11 rounded-full border border-border px-5 text-sm font-semibold">Decline analytics</button>
        <button type="button" onClick={() => choose("granted")} className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Allow analytics</button>
        {consent !== null && <button type="button" onClick={() => setPreferencesOpen(false)} className="min-h-11 px-3 text-sm underline">Close</button>}
      </div>
      {storageError && <p role="alert" className="mt-3 text-sm text-destructive">Your browser could not save this choice. Analytics stays off until a choice can be saved.</p>}
    </section>}
  </PreferencesContext.Provider>;
}

export function AnalyticsPreferencesButton() {
  const open = useContext(PreferencesContext);
  if (!open) return null;
  return <button type="button" onClick={open} className="inline-flex min-h-11 items-center text-left transition-colors hover:text-foreground">Analytics preferences</button>;
}
