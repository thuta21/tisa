import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JerseyDetail from "@/app/pages/JerseyDetail";
import { getPreviewProduct, getPreviewAlternatives } from "@/lib/catalog-server";
import { getSleeveAlternatives } from "@/lib/product-sleeves";
import { productStructuredData, serializeJsonLd } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site";
import { getNonce } from "@/lib/security/nonce";
import { kitOptions } from "@/lib/jerseys";

export async function generateMetadata({ params }: PageProps<"/jersey/[id]">): Promise<Metadata> {
  const jersey = await getPreviewProduct((await params).id);
  if (!jersey) notFound();
  const title = `${jersey.name} | TISA`;
  const description = (jersey.description || `Shop ${jersey.name}${jersey.season ? ` · ${jersey.season}` : ""} at TISA. Explore kit designs, check available sizes and order directly on WhatsApp.`).slice(0, 160);
  const images = [{ url: jersey.image_front, alt: jersey.name }];
  return { title, description, alternates: { canonical: `/jersey/${jersey.slug}` },
    openGraph: { title, description, type: "website", url: `/jersey/${jersey.slug}`, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function Page({ params, searchParams }: PageProps<"/jersey/[id]">) {
  const jersey = await getPreviewProduct((await params).id);
  if (!jersey) notFound();
  const teamJerseys = await getPreviewAlternatives(jersey);
  const alternatives = getSleeveAlternatives(teamJerseys, jersey);
  const related = teamJerseys.filter(item => item.productId !== jersey.productId).slice(0, 3);
  const query = await searchParams;
  const initialKit = kitOptions.find(option => option.id === query.kit)?.id;
  const initialSize = initialKit && typeof query.size === "string" && jersey.kits[initialKit].sizes.includes(query.size) ? query.size : "";
  const site = getSiteUrl();
  const nonce = await getNonce();
  const path = `/jersey/${jersey.slug}`;
  const breadcrumb = site ? {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site.href },
      { "@type": "ListItem", position: 2, name: "Collection", item: new URL("/shop", site).href },
      { "@type": "ListItem", position: 3, name: jersey.name, item: new URL(path, site).href },
    ],
  } : null;
  return <>
    <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productStructuredData(jersey)) }} />
    {breadcrumb && <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />}
    <JerseyDetail key={`${jersey.productId}-${initialKit}-${initialSize}`} jersey={jersey} alternatives={alternatives} related={related} initialKit={initialKit} initialSize={initialSize} />
  </>;
}
