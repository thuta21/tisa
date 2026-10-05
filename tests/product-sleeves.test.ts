import { describe, expect, it } from "vitest";
import {
  getCatalogFamilyKey,
  getSleeveAlternatives,
} from "@/lib/product-sleeves";
import type { CatalogJersey } from "@/lib/products";

function jersey(id: string, sleeve: "short" | "long", seasonId: string): CatalogJersey {
  return {
    id,
    productId: id,
    slug: id,
    name: `Manchester City ${sleeve}`,
    team: "Manchester City",
    category: "Premier League",
    league: "Premier League",
    collection: "2026/27",
    description: "",
    price: 65,
    image_front: "/shirt.png",
    kits: {} as CatalogJersey["kits"],
    country_colors: ["#6cabdd", "#ffffff"],
    featured: true,
    fabric: "Performance knit",
    weight_gsm: 145,
    season: "2026/27",
    sizes: ["M"],
    breathability: 90,
    durability: 90,
    moisture_wicking: 90,
    product: {
      id,
      slug: id,
      name: `Manchester City ${sleeve}`,
      team: "Manchester City",
      category: "Premier League",
      collection: "2026/27",
      description: "",
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
      sleeve,
      leagues: { id: "premier-league", name: "Premier League" },
      teams: { id: "man-city", name: "Manchester City", slug: "manchester-city" },
      seasons: { id: seasonId, name: "2026/27" },
    },
  };
}

describe("catalog sleeve families", () => {
  it("groups short and long sleeve products for the same team and season", () => {
    const short = jersey("city-short", "short", "season-26");
    const long = jersey("city-long", "long", "season-26");

    expect(getCatalogFamilyKey(short)).toBe(getCatalogFamilyKey(long));
    expect(getSleeveAlternatives([short, long], short).map((item) => item.id))
      .toEqual(["city-short", "city-long"]);
  });

  it("does not mix sleeve products from different seasons", () => {
    const current = jersey("city-short-26", "short", "season-26");
    const oldLongSleeve = jersey("city-long-25", "long", "season-25");

    expect(getSleeveAlternatives([current, oldLongSleeve], current).map((item) => item.id))
      .toEqual(["city-short-26"]);
  });
});
