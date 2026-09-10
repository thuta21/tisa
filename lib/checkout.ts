import type { CartItem } from "@/lib/cart";

export type CheckoutRpcItem =
  | { kind: "font"; font_id: string; quantity: number }
  | {
      kind: "jersey";
      variant_id: string;
      size: string;
      quantity: number;
      custom_name: string | null;
      custom_number: string | null;
      font_slug: string | null;
      arm_badge: string | null;
    };

function optionalTrimmed(value: string | undefined) {
  return value?.trim() || null;
}

export function buildCheckoutRpcItems(items: CartItem[]): CheckoutRpcItem[] {
  return items.map((item) => {
    if (item.size === "Font File") {
      return { kind: "font", font_id: item.jerseyId, quantity: item.quantity };
    }

    if (!item.variantId) throw new Error("A jersey in your bag is missing its live stock reference.");

    return {
      kind: "jersey",
      variant_id: item.variantId,
      size: item.size,
      quantity: item.quantity,
      custom_name: optionalTrimmed(item.customName),
      custom_number: optionalTrimmed(item.customNumber),
      font_slug: optionalTrimmed(item.fontSlug),
      arm_badge: optionalTrimmed(item.armBadge),
    };
  });
}
