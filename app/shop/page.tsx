import type { Metadata } from "next";
import Shop from "@/app/pages/Shop";
import { getPreviewCatalog } from "@/lib/catalog-server";

export const metadata: Metadata = {
  title: "Collection | TISA",
  description: "Shop TISA football jerseys by team and league. Browse home and away kits, short and long sleeve styles, check sizes and order on WhatsApp.",
  alternates: { canonical: "/shop" },
  openGraph: { title: "Collection | TISA", description: "Explore football jersey designs by team and league.", url: "/shop", images: ["/share-image"] },
  twitter: { card: "summary_large_image", title: "Collection | TISA", description: "Explore football jersey designs by team and league.", images: ["/share-image"] },
};
export default async function Page() {
  return <Shop jerseys={await getPreviewCatalog()} />;
}
