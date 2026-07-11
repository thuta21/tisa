import { describe, expect, it } from "vitest";
import { getCartItemId, type AddCartItem } from "@/lib/cart";

const baseItem: AddCartItem = {
  jerseyId: "real-madrid-24-25",
  variantId: "home-variant",
  kit: "home",
  size: "M",
  quantity: 1,
  unitPrice: 199,
};

describe("getCartItemId", () => {
  it("is stable for equivalent personalization input", () => {
    expect(getCartItemId({ ...baseItem, customName: "  Messi ", customNumber: "10", fontSlug: "laliga" }))
      .toBe(getCartItemId({ ...baseItem, customName: "messi", customNumber: "10", fontSlug: "laliga" }));
  });

  it("keeps differently configured kits as separate cart entries", () => {
    expect(getCartItemId({ ...baseItem, size: "L" })).not.toBe(getCartItemId(baseItem));
    expect(getCartItemId({ ...baseItem, armBadge: "ucl" })).not.toBe(getCartItemId(baseItem));
  });
});
