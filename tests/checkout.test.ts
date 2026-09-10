import { describe, expect, it } from "vitest";
import { buildCheckoutRpcItems } from "@/lib/checkout";
import type { CartItem } from "@/lib/cart";

describe("secure checkout payload", () => {
  it("sends product identity and choices without client-controlled prices", () => {
    const item: CartItem = {
      id: "cart-item",
      jerseyId: "jersey",
      productId: "product-id",
      variantId: "variant-id",
      kit: "home",
      size: "M",
      quantity: 2,
      unitPrice: 1,
      customizationFee: 0,
      armBadgeFee: 0,
      customName: " Messi ",
      customNumber: "10",
      fontSlug: "league-font",
      armBadge: "ucl",
    };

    const [payload] = buildCheckoutRpcItems([item]);
    expect(payload).toEqual({
      kind: "jersey",
      variant_id: "variant-id",
      size: "M",
      quantity: 2,
      custom_name: "Messi",
      custom_number: "10",
      font_slug: "league-font",
      arm_badge: "ucl",
    });
    expect(payload).not.toHaveProperty("unit_price");
    expect(payload).not.toHaveProperty("line_total");
  });

  it("uses the database font id for digital font orders", () => {
    const font: CartItem = {
      id: "font-cart-item",
      jerseyId: "font-id",
      kit: "home",
      size: "Font File",
      quantity: 1,
      unitPrice: 999,
    };

    expect(buildCheckoutRpcItems([font])).toEqual([{ kind: "font", font_id: "font-id", quantity: 1 }]);
  });
});
