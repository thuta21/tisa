// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ResponsiveSizeChart from "@/components/jersey/ResponsiveSizeChart";
import Navbar from "@/components/jersey/Navbar";
vi.mock("next/navigation", () => ({ usePathname: () => "/shop" }));
afterEach(cleanup);

describe("mobile storefront controls", () => {
  it("updates measurements when a customer chooses a size", () => {
    render(<ResponsiveSizeChart />);
    expect(screen.getByRole("button", { name: "M" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "XL" }));
    expect(screen.getByRole("button", { name: "XL" }).getAttribute("aria-pressed")).toBe("true");
    const measurements = document.querySelector('[aria-live="polite"]')!;
    expect(measurements.textContent).toContain("Size XL");
    expect(measurements.textContent).toContain("77 cm");
    expect(measurements.textContent).toContain("52 cm");
  });
  it("closes navigation on Escape and restores focus and page scrolling", () => {
    document.body.style.overflow = "auto";
    render(<Navbar />);
    const toggle = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(toggle);
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("navigation", { name: "Mobile navigation" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).toBeNull();
    expect(document.body.style.overflow).toBe("auto");
    expect(document.activeElement).toBe(toggle);
  });
  it("dismisses navigation by tapping outside the menu", () => {
    render(<Navbar />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).toBeNull();
  });
});
