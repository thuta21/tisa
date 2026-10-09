import { notFound } from "next/navigation";
import JerseyDetail from "@/app/pages/JerseyDetail";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { catalogProductSelect, productToCatalogJersey, type CatalogProduct } from "@/lib/products";
import { getSleeveAlternatives } from "@/lib/product-sleeves";

export default async function Page({ params }: PageProps<"/jersey/[id]">) {
  const { id } = await params;
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("products").select(catalogProductSelect).eq("status", "active");
  if (error) throw new Error("The collection could not be loaded. Please try again.");
  const jerseys = ((data ?? []) as CatalogProduct[]).map(productToCatalogJersey);
  const jersey = jerseys.find((item) => item.slug === id || item.productId === id);
  if (!jersey) notFound();
  return <JerseyDetail key={jersey.productId} jersey={jersey} alternatives={getSleeveAlternatives(jerseys, jersey)} />;
}
