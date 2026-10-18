import type { MarketingContacts } from "./content";

// Public business contacts used in marketing captions; environment values can override them.
export const defaultMarketingContacts = {
  facebook: "https://www.facebook.com/profile.php?id=100095189741020",
  whatsapp: "971543831461",
  phone: "+971543831461",
} satisfies MarketingContacts;
