export type WhatsAppContact = {
  id: string;
  label: string;
  phone: string;
  is_available: boolean;
  sort_order: number;
};

export function normalizeWhatsAppNumber(value: string) {
  const phone = value.trim().replace(/^\+/, "").replace(/[ ()-]/g, "");
  if (!/^[1-9]\d{6,14}$/.test(phone)) throw new Error("Use an international WhatsApp number with country code (7–15 digits).");
  return phone;
}

export function buildWhatsAppOrderUrl(phone: string, order: {
  customerName: string; customerPhone: string; productName: string; productUrl: string;
  kit: string; sleeve: string; size: string; quantity: number; unitPrice: number; sku?: string | null;
}) {
  const message = [
    "Hi TISA, I would like to order:", "",
    `Customer: ${order.customerName}`, `Phone: ${order.customerPhone}`, "",
    `Product: ${order.productName}`, `Kit: ${order.kit}`, `Sleeve: ${order.sleeve}`,
    ...(order.sku ? [`SKU: ${order.sku}`] : []),
    `Size: ${order.size}`, `Quantity: ${order.quantity}`,
    `Unit price: AED ${order.unitPrice.toFixed(2)}`,
    `Product subtotal: AED ${(order.unitPrice * order.quantity).toFixed(2)}`,
    order.productUrl, "", "Please confirm availability, delivery and the final total.",
  ].join("\n");
  return `https://wa.me/${normalizeWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`;
}
