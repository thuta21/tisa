import type { KitVariant } from "@/lib/jerseys";

export type CartItem = {
  id: string;
  jerseyId: string;
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
    item.jerseyId,
    item.kit,
    item.size,
    item.customName?.trim().toUpperCase() || "standard",
    item.customNumber?.trim() || "none",
    item.fontSlug || "default",
    item.armBadge || "none",
  ].join(":");
}
