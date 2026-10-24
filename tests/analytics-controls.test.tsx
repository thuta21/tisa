// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ path: "/shop", consent: null as "granted" | "denied" | null, start: vi.fn(), pause: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mock.path }));
vi.mock("@/lib/analytics", () => ({
  CONSENT_EVENT: "tisa:analytics-consent", getAnalyticsConsent: () => mock.consent,
  startAnalytics: mock.start, pauseAnalytics: mock.pause, hasAnalyticsStarted: () => false, clearAnalyticsCookies: vi.fn(),
  saveAnalyticsConsent: (choice: "granted" | "denied") => { mock.consent = choice; window.dispatchEvent(new Event("tisa:analytics-consent")); return true; },
}));
import AnalyticsProvider, { AnalyticsPreferencesButton } from "@/components/analytics/AnalyticsProvider";
const config = { enabled: true, measurementId: "G-HZEBCV1FMR", origin: "https://tisa.test" };
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mock.path = "/shop"; mock.consent = null; });
describe("Analytics preferences", () => {
  it("waits for explicit consent, allows declining and reopens from the footer control", () => {
    render(<AnalyticsProvider config={config} nonce="nonce"><AnalyticsPreferencesButton /></AnalyticsProvider>);
    expect(screen.getByRole("region", { name: "Analytics preferences" })).toBeTruthy();
    expect(mock.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Decline analytics" }));
    expect(screen.queryByRole("region")).toBeNull();
    expect(mock.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Analytics preferences" }));
    fireEvent.click(screen.getByRole("button", { name: "Allow analytics" }));
    expect(mock.start).toHaveBeenCalledWith(config, "nonce");
    expect(screen.queryByRole("region")).toBeNull();
  });
  it("does not initialize tracking or show a banner on private routes or disabled builds", () => {
    mock.path = "/admin/products"; mock.consent = "granted";
    const { rerender } = render(<AnalyticsProvider config={config} nonce="nonce">Private</AnalyticsProvider>);
    expect(mock.start).not.toHaveBeenCalled();
    expect(screen.queryByRole("region")).toBeNull();
    mock.path = "/shop";
    rerender(<AnalyticsProvider config={{ ...config, enabled: false }} nonce="nonce"><AnalyticsPreferencesButton /></AnalyticsProvider>);
    expect(mock.start).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
