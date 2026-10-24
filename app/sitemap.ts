import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  if (!site) return [];
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("products").select("slug,updated_at").eq("status", "active").order("slug");
  if (error) throw new Error("The collection sitemap could not be loaded.");
  return [
    ...["/", "/shop", "/contact", "/customer-care", "/privacy", "/terms"].map(path => ({ url: new URL(path, site).href })),
    ...(data ?? []).map(product => ({ url: new URL(`/jersey/${product.slug}`, site).href, lastModified: product.updated_at })),
  ];
}
