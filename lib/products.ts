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
  created_at?: string;
  leagues?: { id: string; name: string } | null;
  teams?: { id: string; name: string } | null;
  seasons?: { id: string; name: string } | null;
  product_variants?: CatalogVariant[];
};

export type CatalogJerseyKit = JerseyKit & {
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

export const catalogProductSelect =
  "*, leagues(id, name), teams(id, name), seasons(id, name), product_variants(*, inventory(*))";

export function getPublicProductImage(path?: string | null) {
  if (!path) return "/assets/tisa-shirt.png";
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
    ?? product.product_variants?.[0]
    ?? null;
}

export function productToCatalogJersey(product: CatalogProduct): CatalogJersey {
  const variants = product.product_variants ?? [];
  const firstVariant = getFirstAvailableVariant(product) ?? variants[0];
  const fallbackImage = getPublicProductImage(firstVariant?.image_front_path);
  const fallbackBackImage = getPublicProductImage(firstVariant?.image_back_path ?? firstVariant?.image_front_path);
  const activeSizes = getProductActiveSizes(product);
  const colors = product.country_colors.length ? product.country_colors : ["#111111", "#ffffff", "#737373"];

  const kits = Object.fromEntries(kitOptions.map((kit) => {
    const variant = variants.find((item) => item.kit === kit.id);
    const stock = getVariantAvailableStock(variant);
    const stockBySize = Object.fromEntries((variant?.inventory ?? []).map((row) => [row.size, getAvailableStock(row)]));
    const kitValue: CatalogJerseyKit = {
      image: getPublicProductImage(variant?.image_front_path ?? firstVariant?.image_front_path),
      imageBack: getPublicProductImage(variant?.image_back_path ?? variant?.image_front_path ?? firstVariant?.image_back_path ?? firstVariant?.image_front_path),
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

export async function loadCatalogJersey(idOrSlug: string) {
  const jerseys = await loadCatalogJerseys();
  return jerseys.find((jersey) => jersey.slug === idOrSlug || jersey.productId === idOrSlug) ?? null;
}
