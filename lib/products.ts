import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { supabaseUrl } from "@/lib/supabase/config";
import {
  kitOptions,
  type Jersey,
  type JerseyKit,
  type KitVariant,
} from "@/lib/jerseys";

export type CatalogInventory = {
  id: string;
  variant_id: string;
  size: string;
  quantity: number;
  reserved: number;
  is_active?: boolean;
};

export type CatalogVariant = {
  id: string;
  product_id: string;
  kit: KitVariant;
  name: string;
  sku: string | null;
  price: number;
  image_front_path: string | null;
  image_back_path: string | null;
  image_arm_path?: string | null;
  available: boolean;
  inventory?: CatalogInventory[];
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  team: string;
  category: string;
  collection: string | null;
  description: string | null;
  base_price: number;
  season: string | null;
  fabric: string | null;
  weight_gsm: number | null;
  breathability: number | null;
  durability: number | null;
  moisture_wicking: number | null;
  country_colors: string[];
  featured: boolean;
  status: "draft" | "active" | "archived";
  sleeve?: "short" | "long";
  created_at?: string;
  leagues?: { id: string; name: string } | null;
  teams?: { id: string; name: string; slug: string; logo_path?: string | null } | null;
  seasons?: { id: string; name: string } | null;
  product_variants?: CatalogVariant[];
};

export type CatalogJerseyKit = JerseyKit & {
  previewAvailable: boolean;
  variantId?: string;
  variantName?: string;
  sku?: string | null;
  imageBack?: string;
  stock: number;
  sizes: string[];
  stockBySize: Record<string, number>;
};

export type CatalogJersey = Omit<Jersey, "kits"> & {
  productId: string;
  slug: string;
  product: CatalogProduct;
  kits: Record<KitVariant, CatalogJerseyKit>;
};

export type CatalogTeam = {
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  sort_order: number;
  leagues?: { id: string; name: string; slug: string; logo_path?: string | null } | null;
};

export type CatalogLeague = {
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  sort_order: number;
};

export const catalogProductSelect =
  "*, leagues(id, name), teams(*), seasons(id, name), product_variants(*, inventory(*))";

export function getPublicProductImage(path?: string | null) {
  if (!path) return "/assets/jersey-placeholder.svg";
  if (path.startsWith("/") || path.startsWith("http")) return path;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/product-images/${encodedPath}`;
}

export function isInventoryActive(row: Pick<CatalogInventory, "is_active">) {
  return row.is_active !== false;
}

export function getAvailableStock(row: Pick<CatalogInventory, "quantity" | "reserved" | "is_active">) {
  if (!isInventoryActive(row)) return 0;
  return Math.max(0, row.quantity - row.reserved);
}

export function getVariantAvailableStock(variant?: Pick<CatalogVariant, "available" | "inventory"> | null) {
  if (!variant?.available) return 0;
  return (variant.inventory ?? []).reduce((sum, row) => sum + getAvailableStock(row), 0);
}

export function getVariantAvailableSizes(variant?: Pick<CatalogVariant, "available" | "inventory"> | null) {
  if (!variant?.available) return [];
  return (variant.inventory ?? [])
    .filter((row) => getAvailableStock(row) > 0)
    .map((row) => row.size);
}

export function getProductActiveSizes(product: CatalogProduct) {
  const sizes = new Set<string>();
  for (const variant of product.product_variants ?? []) {
    if (!variant.available) continue;
    for (const row of variant.inventory ?? []) {
      if (isInventoryActive(row)) sizes.add(row.size);
    }
  }
  return Array.from(sizes);
}

export function getFirstAvailableVariant(product: CatalogProduct) {
  return kitOptions
    .map((kit) => product.product_variants?.find((variant) => variant.kit === kit.id))
    .find((variant) => variant && getVariantAvailableStock(variant) > 0)
    ?? product.product_variants?.find((variant) => variant.available)
    ?? null;
}

// Preview visibility follows the admin switch. Purchase availability also requires stock.
export function isCatalogKitPreviewAvailable(jersey: Pick<CatalogJersey, "kits">, kit: KitVariant) {
  const variant = jersey.kits[kit];
  return Boolean(variant?.variantId && variant.previewAvailable);
}

export function getCatalogPreviewKit(
  jersey: Pick<CatalogJersey, "kits">,
  preferredKit?: KitVariant | null,
): KitVariant | null {
  if (preferredKit && isCatalogKitPreviewAvailable(jersey, preferredKit)) return preferredKit;
  return kitOptions.find((kit) => isCatalogKitPreviewAvailable(jersey, kit.id))?.id ?? null;
}

export function productToCatalogJersey(product: CatalogProduct): CatalogJersey {
  const variants = product.product_variants ?? [];
  const firstVariant = getFirstAvailableVariant(product);
  const fallbackImage = getPublicProductImage(firstVariant?.image_front_path);
  const fallbackBackImage = firstVariant?.image_back_path ? getPublicProductImage(firstVariant.image_back_path) : undefined;
  const activeSizes = getProductActiveSizes(product);
  const colors = product.country_colors.length ? product.country_colors : ["#111111", "#ffffff", "#737373"];

  const kits = Object.fromEntries(kitOptions.map((kit) => {
    const variant = variants.find((item) => item.kit === kit.id);
    const stock = getVariantAvailableStock(variant);
    const stockBySize = Object.fromEntries((variant?.inventory ?? []).map((row) => [row.size, variant?.available ? getAvailableStock(row) : 0]));
    const kitValue: CatalogJerseyKit = {
      image: getPublicProductImage(variant?.image_front_path),
      imageBack: variant?.image_back_path ? getPublicProductImage(variant.image_back_path) : undefined,
      previewAvailable: Boolean(variant?.available),
      available: Boolean(variant?.available && stock > 0),
      price: variant?.price ?? product.base_price,
      variantId: variant?.id,
      variantName: variant?.name,
      sku: variant?.sku,
      stock,
      sizes: getVariantAvailableSizes(variant),
      stockBySize,
    };
    return [kit.id, kitValue];
  })) as Record<KitVariant, CatalogJerseyKit>;

  return {
    id: product.slug,
    productId: product.id,
    slug: product.slug,
    product,
    name: product.name,
    team: product.teams?.name ?? product.team,
    teamLogoPath: product.teams?.logo_path ?? null,
    category: product.leagues?.name ?? product.category,
    league: product.leagues?.name ?? product.category,
    collection: product.collection ?? product.seasons?.name ?? product.season ?? "",
    description: product.description ?? "",
    price: firstVariant?.price ?? product.base_price,
    image_front: fallbackImage,
    image_back: fallbackBackImage,
    kit_images: Object.fromEntries(kitOptions.map((kit) => [kit.id, kits[kit.id].image])),
    kits,
    country_colors: [colors[0] ?? "#111111", colors[1] ?? "#ffffff", colors[2]],
    featured: product.featured,
    fabric: product.fabric ?? "Performance knit",
    weight_gsm: product.weight_gsm ?? 145,
    season: product.seasons?.name ?? product.season ?? "",
    sizes: activeSizes,
    breathability: product.breathability ?? 90,
    durability: product.durability ?? 88,
    moisture_wicking: product.moisture_wicking ?? 90,
  };
}

export async function loadCatalogProducts() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("products")
    .select(catalogProductSelect)
    .eq("status", "active")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CatalogProduct[];
}

export async function loadCatalogJerseys() {
  const products = await loadCatalogProducts();
  return products.map(productToCatalogJersey);
}

export async function loadCatalogTeams() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*, leagues(*)")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CatalogTeam[];
}

export async function loadCatalogLeagues() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("leagues")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CatalogLeague[];
}

export async function loadCatalogJersey(idOrSlug: string) {
  const jerseys = await loadCatalogJerseys();
  return jerseys.find((jersey) => jersey.slug === idOrSlug || jersey.productId === idOrSlug) ?? null;
}
