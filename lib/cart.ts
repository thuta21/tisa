import type { KitVariant } from "@/lib/jerseys";

export type CartItem = {
  id: string;
  jerseyId: string;
  productId?: string;
  variantId?: string;
  productName?: string;
  variantName?: string;
  imageUrl?: string;
  productSlug?: string;
  kit: KitVariant;
  size: string;
  quantity: number;
  unitPrice: number;
  customName?: string;
  customNumber?: string;
  fontSlug?: string;
  armBadge?: string;
  customizationFee?: number;
  armBadgeFee?: number;
};

export type AddCartItem = Omit<CartItem, "id">;

export function getCartItemId(item: AddCartItem) {
  return [
    item.variantId ?? item.jerseyId,
    item.kit,
    item.size,
    item.customName?.trim().toUpperCase() || "standard",
    item.customNumber?.trim() || "none",
    item.fontSlug || "default",
    item.armBadge || "none",
  ].join(":");
}
