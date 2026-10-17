import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/config", () => ({ supabaseUrl: "https://catalog.example.test" }));
import { filterCatalog, getCardImage, readCatalogFilters } from "@/lib/catalog-filters";
import { productToCatalogJersey, type CatalogProduct } from "@/lib/products";

function jersey(name: string, sleeve: "short" | "long", season: string, away = true) {
  return productToCatalogJersey({
    id: name, slug: name, name, team: "Arsenal", category: "Premier League", collection: "Player", season,
    description: null, fabric: null, weight_gsm: null, breathability: null, durability: null, moisture_wicking: null,
    base_price: 0, country_colors: [], featured: false, status: "active", sleeve,
    product_variants: (["home", "away"] as const).map(kit => ({
      id: `${name}-${kit}`, product_id: name, kit, name: kit, price: 0, sku: null, image_back_path: null,
      available: kit === "home" || away, image_front_path: `/images/${kit}.png`,
    })),
  } satisfies CatalogProduct);
}
const items = [jersey("Zebra", "short", "2025/26"), jersey("Alpha", "long", "2026/27"), jersey("Beta", "short", "2026/27", false)];
const filters = (value: string) => readCatalogFilters(new URLSearchParams(value));

describe("collection discovery", () => {
  it("combines filters and returns only publicly enabled kit designs", () => {
    expect(filterCatalog(items, filters("season=2026%2F27&sleeve=short&kit=away"))).toEqual([]);
    expect(filterCatalog(items, filters("season=2026%2F27&kit=away")).map(i => i.name)).toEqual(["Alpha"]);
  });
  it("finds sleeves and kit labels regardless of word order", () => {
    expect(filterCatalog(items, filters("q=away+long+sleeve")).map(i => i.name)).toEqual(["Alpha"]);
    expect(filterCatalog(items, filters("q=Beta+away"))).toEqual([]);
  });
  it("sorts without changing featured catalog order", () => {
    expect(filterCatalog(items, filters("sort=name")).map(i => i.name)).toEqual(["Alpha", "Beta", "Zebra"]);
    expect(filterCatalog(items, filters("sort=season")).map(i => i.name)).toEqual(["Alpha", "Beta", "Zebra"]);
    expect(items.map(i => i.name)).toEqual(["Zebra", "Alpha", "Beta"]);
  });
  it("ignores unsupported style and sort values in shared URLs", () => {
    expect(filters("sleeve=invalid&kit=invalid&sort=price")).toMatchObject({ sleeve: "", kit: "", sort: "featured" });
  });
  it("shows the filtered kit photo and falls back for a disabled kit", () => {
    expect(getCardImage(items[0], "away")).toBe("/images/away.png");
    expect(getCardImage(items[2], "away")).toBe("/images/home.png");
  });
});
