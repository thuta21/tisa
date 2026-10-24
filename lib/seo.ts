import type { CatalogJersey } from "@/lib/products";
import { getSiteUrl } from "@/lib/site";

export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

export function productStructuredData(jersey: CatalogJersey) {
  const site = getSiteUrl();
  const url = site ? new URL(`/jersey/${jersey.slug}`, site).href : undefined;
  const absolute = (path: string) => site ? new URL(path, site).href : /^https?:/.test(path) ? path : undefined;
  const kits = Object.values(jersey.kits).filter(kit => kit.previewAvailable && kit.variantId);
  return {
    "@context": "https://schema.org", "@type": "Product",
    ...(url ? { "@id": `${url}#product`, url } : {}),
    name: jersey.name, description: jersey.description || `${jersey.team} football jersey${jersey.season ? `, ${jersey.season}` : ""}.`,
    image: [...new Set(kits.flatMap(kit => [absolute(kit.image), kit.imageBack ? absolute(kit.imageBack) : undefined]).filter(Boolean))],
    category: "Football Jerseys", size: jersey.sizes,
    ...(jersey.product.fabric ? { material: jersey.product.fabric } : {}),
    offers: kits.map(kit => ({ "@type": "Offer", name: kit.variantName, price: kit.price, priceCurrency: "AED", url,
      ...(kit.sku ? { sku: kit.sku } : {}),
      availability: kit.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "TISA" },
    })),
  };
}
