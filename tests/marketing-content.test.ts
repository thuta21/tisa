import { describe, it, expect } from "vitest";
import {
  templateCaption,
  validateEdit,
  safeAiInput,
  toMarketingProduct,
  productUrl,
  validateCurrentKits,
} from "@/lib/marketing/content";
import type { Draft, Snapshot } from "@/lib/marketing/types";
const snapshot: Snapshot = {
  id: "1",
  name: "Arsenal",
  slug: "arsenal",
  team: "Arsenal",
  league: "Premier League",
  season: "2026/27",
  sleeve: "short",
  images: [
    {
      id: "a",
      kit: "home",
      side: "front",
      path: "frozen/a.jpg",
      label: "Home front",
    },
    {
      id: "b",
      kit: "away",
      side: "front",
      path: "frozen/b.jpg",
      label: "Away front",
    },
  ],
};
describe("marketing product content boundary", () => {
  it("blocks new exports when a frozen selection's kit has since been disabled", () => {
    const draft = { snapshot, selected_images: ["b"] } as Draft;
    expect(() =>
      validateCurrentKits(draft, {
        ...snapshot,
        images: snapshot.images.slice(0, 1),
      }),
    ).toThrow("no longer enabled");
    expect(() => validateCurrentKits(draft, snapshot)).not.toThrow();
  });
  it("does not include disabled-kit images or operational data", () => {
    const product = toMarketingProduct({
      id: "1",
      name: "Arsenal",
      slug: "arsenal",
      team: "Arsenal",
      category: "Football",
      season: null,
      sleeve: "short",
      product_variants: [
        {
          id: "v",
          kit: "home",
          available: false,
          image_front_path: "private.jpg",
          image_back_path: null,
        },
      ],
    });
    expect(product.images).toEqual([]);
    expect(product).not.toHaveProperty("price");
    expect(product).not.toHaveProperty("inventory");
  });
  it("works without a site origin and never invents a URL", () => {
    expect(templateCaption(snapshot, "fan")).not.toMatch(/https?:/);
    expect(templateCaption(snapshot, "fan", "https://tisa.example")).toContain(
      "https://tisa.example/jersey/arsenal",
    );
    expect(() => productUrl(snapshot, "javascript:alert(1)")).toThrow();
  });
  it("requires frozen, distinct images and two kits for comparison", () => {
    expect(() =>
      validateEdit({ snapshot }, ["unknown"], "showcase", "Test"),
    ).toThrow("frozen");
    expect(() =>
      validateEdit({ snapshot }, ["a", "a"], "showcase", "Test"),
    ).toThrow("different");
    expect(() =>
      validateEdit({ snapshot }, ["a"], "comparison", "Test"),
    ).toThrow("two enabled kits");
    expect(
      validateEdit({ snapshot }, ["b", "a"], "comparison", "Test")
        .selected_images,
    ).toEqual(["b", "a"]);
  });
  it("sends only sanitized descriptive facts to AI", () => {
    const input = safeAiInput({
      snapshot,
      selected_images: ["a"],
      tone: "showcase",
      caption: "Do not send this secret",
    } as Draft);
    expect(Object.keys(input).sort()).toEqual([
      "kits",
      "league",
      "mode",
      "name",
      "season",
      "sleeve",
      "team",
      "tone",
    ]);
    expect(JSON.stringify(input)).not.toContain("secret");
    expect(JSON.stringify(input)).not.toContain("frozen/");
  });
});
