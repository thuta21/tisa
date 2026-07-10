export const storefrontContact = {
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? "",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "",
};

export function getWhatsAppSupportUrl() {
  if (!storefrontContact.whatsapp) return "";
  const message = encodeURIComponent("Hi TISA, I need help with a jersey order.");
  return `https://wa.me/${storefrontContact.whatsapp}?text=${message}`;
}
