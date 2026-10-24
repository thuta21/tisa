import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { productToCatalogJersey, type CatalogProduct, type CatalogTeam, type CatalogLeague } from "@/lib/products";

// Public catalog fields include current size availability for WhatsApp ordering.
export const previewProductSelect = "id,slug,name,team,category,collection,description,base_price,season,fabric,country_colors,featured,status,sleeve,leagues(id,name),teams(id,name,slug,logo_path),seasons(id,name),product_variants(id,product_id,kit,name,sku,price,image_front_path,image_back_path,available,inventory(id,variant_id,size,quantity,reserved,is_active))";
const toJersey = (row: unknown) => productToCatalogJersey(row as CatalogProduct);

export const getPreviewCatalog = cache(async () => {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("products").select(previewProductSelect).eq("status", "active")
    .order("featured", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error("The collection could not be loaded. Please try again.");
  return (data ?? []).map(toJersey);
});

export const getPreviewNavigation = cache(async () => {
  const db = await createSupabaseServerClient();
  const [teams, leagues] = await Promise.all([
    db.from("teams").select("id,name,slug,logo_path,sort_order").order("sort_order"),
    db.from("leagues").select("id,name,slug,logo_path,sort_order").order("sort_order"),
  ]);
  if (teams.error || leagues.error) throw new Error("The collection could not be loaded. Please try again.");
  return { catalogTeams: (teams.data ?? []) as CatalogTeam[], catalogLeagues: (leagues.data ?? []) as CatalogLeague[] };
});

export const getPreviewProduct = cache(async (id: string) => {
  const db = await createSupabaseServerClient();
  const column = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? "id" : "slug";
  const { data, error } = await db.from("products").select(previewProductSelect).eq("status", "active").eq(column, id).maybeSingle();
  if (error) throw new Error("The jersey could not be loaded. Please try again.");
  return data ? toJersey(data) : null;
});

export async function getPreviewAlternatives(jersey: Awaited<ReturnType<typeof getPreviewProduct>>) {
  if (!jersey) return [];
  const db = await createSupabaseServerClient();
  const query = db.from("products").select(previewProductSelect).eq("status", "active");
  const { data, error } = await (jersey.product.teams?.id
    ? query.eq("team_id", jersey.product.teams.id)
    : query.eq("team", jersey.product.team)).order("featured", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error("Sleeve styles could not be loaded. Please try again.");
  return (data ?? []).map(toJersey);
}
