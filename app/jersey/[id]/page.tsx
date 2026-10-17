import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JerseyDetail from "@/app/pages/JerseyDetail";
import { getPreviewProduct, getPreviewAlternatives } from "@/lib/catalog-server";
import { getSleeveAlternatives } from "@/lib/product-sleeves";

export async function generateMetadata({ params }: PageProps<"/jersey/[id]">): Promise<Metadata> {
  const jersey = await getPreviewProduct((await params).id);
  if (!jersey) notFound();
  const title = `${jersey.name} | TISA`;
  const description = jersey.description || `Explore ${jersey.name}${jersey.season ? ` · ${jersey.season}` : ""}, kit designs and fit guidance. TISA collection preview; online ordering is not open yet.`;
  const images = [{ url: jersey.image_front, alt: jersey.name }];
  return { title, description, alternates: { canonical: `/jersey/${jersey.slug}` },
    openGraph: { title, description, type: "website", url: `/jersey/${jersey.slug}`, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function Page({ params }: PageProps<"/jersey/[id]">) {
  const jersey = await getPreviewProduct((await params).id);
  if (!jersey) notFound();
  const alternatives = getSleeveAlternatives(await getPreviewAlternatives(jersey), jersey);
  return <JerseyDetail key={jersey.productId} jersey={jersey} alternatives={alternatives} />;
}
