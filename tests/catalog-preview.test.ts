// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FeaturedJerseyShowcase from "@/components/jersey/FeaturedJerseyShowcase";
import JerseyDetail from "@/app/pages/JerseyDetail";
import {
  getCatalogPreviewKit,
  isCatalogKitPreviewAvailable,
  productToCatalogJersey,
  type CatalogProduct,
  type CatalogVariant,
} from "@/lib/products";

vi.mock("@/lib/supabase/config", () => ({ supabaseUrl: "https://catalog.example.test" }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  useReducedMotion: () => true,
}));

afterEach(cleanup);

function variant(kit: CatalogVariant["kit"], overrides: Partial<CatalogVariant> = {}): CatalogVariant {
  return {
    id: `arsenal-${kit}`,
    product_id: "arsenal",
    kit,
    name: `${kit} kit`,
    sku: null,
    price: 65,
    image_front_path: `/images/${kit}-front.png`,
    image_back_path: `/images/${kit}-back.png`,
    available: true,
    inventory: [{ id: kit, variant_id: `arsenal-${kit}`, size: "M", quantity: 5, reserved: 1, is_active: true }],
    ...overrides,
  };
}

function product(variants: CatalogVariant[], overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "arsenal",
    slug: "arsenal-short",
    name: "Arsenal short sleeve",
    team: "Arsenal",
    category: "Premier League",
    collection: "2026/27",
    description: null,
    base_price: 65,
    season: "2026/27",
    fabric: null,
    weight_gsm: null,
    breathability: null,
    durability: null,
    moisture_wicking: null,
    country_colors: [],
    featured: true,
    status: "active",
    sleeve: "short",
    product_variants: variants,
    ...overrides,
  };
}

describe("catalog preview availability", () => {
  it("matches the public view when an admin response includes disabled kit records", () => {
    const variants = [variant("home"), variant("away"), variant("third", { available: false })];
    const adminView = productToCatalogJersey(product(variants));
    const publicView = productToCatalogJersey(product(variants.filter((item) => item.available)));

    expect(adminView.kits.third.variantId).toBeTruthy();
    for (const kit of ["home", "away", "third"] as const) {
      expect(isCatalogKitPreviewAvailable(adminView, kit)).toBe(isCatalogKitPreviewAvailable(publicView, kit));
    }
    expect(isCatalogKitPreviewAvailable(adminView, "third")).toBe(false);
    expect(getCatalogPreviewKit(adminView, "third")).toBe("home");
    expect(adminView.kits.third).toMatchObject({ available: false, stock: 0, sizes: [], stockBySize: { M: 0 } });
  });

  it("does not invent a kit or image for a missing variant", () => {
    const jersey = productToCatalogJersey(product([variant("home"), variant("away")]));

    expect(isCatalogKitPreviewAvailable(jersey, "third")).toBe(false);
    expect(jersey.kits.third.variantId).toBeUndefined();
    expect(jersey.kits.third.image).toBe("/assets/jersey-placeholder.svg");
    expect(jersey.kits.third.imageBack).toBeUndefined();
  });

  it("keeps an enabled kit visible for preview without advertising purchase stock", () => {
    const jersey = productToCatalogJersey(product([variant("home", { inventory: [] })]));

    expect(isCatalogKitPreviewAvailable(jersey, "home")).toBe(true);
    expect(getCatalogPreviewKit(jersey)).toBe("home");
    expect(jersey.kits.home).toMatchObject({ available: false, stock: 0, sizes: [] });
  });

  it("validates the selected kit against the new sleeve product", () => {
    const short = productToCatalogJersey(product([variant("home"), variant("away")]));
    const long = productToCatalogJersey(product([variant("home")], { id: "arsenal-long", sleeve: "long" }));

    expect(getCatalogPreviewKit(short, "away")).toBe("away");
    expect(getCatalogPreviewKit(long, "away")).toBe("home");
  });

  it("uses a placeholder for a kit's missing front and never borrows another kit's back", () => {
    const jersey = productToCatalogJersey(product([
      variant("home"),
      variant("away", { image_front_path: null, image_back_path: null }),
    ]));

    expect(jersey.kits.away.image).toBe("/assets/jersey-placeholder.svg");
    expect(jersey.kits.away.imageBack).toBeUndefined();
    expect(jersey.kits.home.image).toBe("/images/home-front.png");
    expect(jersey.kits.home.imageBack).toBe("/images/home-back.png");
  });

  it("does not present the front photo as a back view", () => {
    const jersey = productToCatalogJersey(product([variant("home", { image_back_path: null })]));

    expect(jersey.image_front).toBe("/images/home-front.png");
    expect(jersey.image_back).toBeUndefined();
    expect(jersey.kits.home.imageBack).toBeUndefined();
  });

  it.each([
    { variants: [] },
    { variants: [variant("home", { available: false })] },
  ])("leaves no kit selected when all kit previews are unavailable: %j", ({ variants }) => {
    const jersey = productToCatalogJersey(product(variants));

    expect(getCatalogPreviewKit(jersey, "home")).toBeNull();
    expect(jersey.image_front).toBe("/assets/jersey-placeholder.svg");
    expect(jersey.image_back).toBeUndefined();
    expect(jersey.sizes).toEqual([]);
  });
});

describe("kit selectors with admin-visible catalog data", () => {
  it("disables Third and falls back to Home when changing to a sleeve without Away", () => {
    const short = productToCatalogJersey(product([variant("home"), variant("away"), variant("third", { available: false })]));
    const long = productToCatalogJersey(product([variant("home")], { id: "arsenal-long", slug: "arsenal-long", sleeve: "long" }));
    render(createElement(FeaturedJerseyShowcase, { jerseys: [short, long], catalogTeams: [], catalogLeagues: [], onSelect: vi.fn() }));

    const third = screen.getByRole<HTMLButtonElement>("button", { name: "Third — unavailable" });
    expect(third.disabled).toBe(true);
    fireEvent.click(third);
    expect(screen.getByRole("button", { name: "Home" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Away" }));
    expect(screen.getByRole("button", { name: "Away" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Long Sleeve" }));
    expect(screen.getByRole("button", { name: "Home" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Away — unavailable" }).disabled).toBe(true);
  });

  it("omits disabled kits on the detail page and disables a missing back photo", () => {
    const jersey = productToCatalogJersey(product([
      variant("home"),
      variant("away", { image_back_path: null }),
      variant("third", { available: false }),
    ]));
    render(createElement(JerseyDetail, { jersey, alternatives: [jersey] }));

    expect(screen.queryByRole("button", { name: "Third Kit" })).toBeNull();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "back view" }).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "back view" }));
    fireEvent.click(screen.getByRole("button", { name: "Away Kit" }));
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "back view — unavailable" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "front view" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("img", { name: "Arsenal short sleeve, away kit, front view" }).getAttribute("src")).toContain("away-front.png");
  });
});
