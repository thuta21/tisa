import type {
  Draft,
  Kit,
  MarketingProduct,
  Snapshot,
  SourceImage,
  Tone,
} from "./types";
export const marketingSelect =
  "id,name,slug,team,category,season,sleeve,leagues(name),teams(name),seasons(name),product_variants(id,kit,available,image_front_path,image_back_path)";
type ProductRow = {
  id: string;
  name: string;
  slug: string;
  team: string;
  category: string;
  season: string | null;
  sleeve: string;
  leagues?: { name: string } | null;
  teams?: { name: string } | null;
  seasons?: { name: string } | null;
  product_variants?: {
    id: string;
    kit: Kit;
    available: boolean;
    image_front_path: string | null;
    image_back_path: string | null;
  }[];
};
export function toMarketingProduct(row: ProductRow): MarketingProduct {
  const images: SourceImage[] = [];
  for (const variant of row.product_variants ?? []) {
    if (!variant.available) continue;
    for (const side of ["front", "back"] as const) {
      const path = variant[`image_${side}_path`];
      if (path)
        images.push({
          id: `${variant.id}:${side}`,
          kit: variant.kit,
          side,
          path,
          label: `${variant.kit} · ${side}`,
        });
    }
  }
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    team: row.teams?.name ?? row.team,
    league: row.leagues?.name ?? row.category,
    season: row.seasons?.name ?? row.season ?? "",
    sleeve: row.sleeve,
    images,
  };
}
export function productUrl(snapshot: Snapshot, origin?: string) {
  if (!origin) return "";
  const url = new URL(origin);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("Configure a valid public site origin.");
  return new URL(`/jersey/${encodeURIComponent(snapshot.slug)}`, url.origin)
    .href;
}
export function templateCaption(
  snapshot: Snapshot,
  tone: Tone,
  origin?: string,
  selectedImageIds?: string[],
) {
  const images = selectedImageIds
    ? snapshot.images.filter((image) => selectedImageIds.includes(image.id))
    : snapshot.images;
  const kits = [...new Set(images.map((image) => image.kit))]
    .map((kit) => `${kit[0].toUpperCase()}${kit.slice(1)} Kit`)
    .join(" / ");
  const intro =
    tone === "fan"
      ? `${snapshot.team} ပရိသတ်ဆို ကိုယ့်အသင်းရဲ့ jersey လေးနဲ့ အားပေးလိုက်ပါ ⚽`
      : tone === "comparison"
        ? `${snapshot.team} အတွက် ${kits} — ဘယ် kit လေးကို ဝတ်ပြီး အားပေးမလဲ? ⚽`
        : `ကိုယ့်အသင်းကို အားပေးဖို့ ${snapshot.team} jersey လေး ရွေးလိုက်ပါ ⚽`;
  const facts = [
    snapshot.season && `${snapshot.season} Season`,
    kits,
    snapshot.sleeve === "long"
      ? "လက်ရှည်"
      : snapshot.sleeve === "short"
        ? "လက်တို"
        : "",
  ]
    .filter(Boolean)
    .join(" • ");
  return finishCaption(
    `${intro}\n\n${snapshot.name}${facts ? `\n${facts}` : ""}`,
    snapshot,
    origin,
  );
}
export const marketingCallToAction =
  "မှာယူလိုပါက Page Messenger မှာ ကြိုက်တဲ့ team၊ kit နဲ့ size ကို ပို့ပြီး စျေးနှုန်းနဲ့ ရရှိနိုင်မှုကို စုံစမ်းနိုင်ပါတယ်။";
export function finishCaption(
  body: string,
  snapshot: Snapshot,
  origin?: string,
) {
  const url = productUrl(snapshot, origin);
  return `${body.trim()}\n\n${marketingCallToAction}${url ? `\nဒီဇိုင်းကြည့်ရန်: ${url}` : ""}\n\n#TISA #FootballJersey`;
}
export function validateEdit(
  draft: Pick<Draft, "snapshot">,
  selected: unknown,
  tone: unknown,
  caption: unknown,
) {
  if (
    !Array.isArray(selected) ||
    selected.length < 1 ||
    selected.length > 4 ||
    selected.some((id) => typeof id !== "string") ||
    new Set(selected).size !== selected.length
  )
    throw new Error("Select 1–4 different product images.");
  if (!["showcase", "fan", "comparison"].includes(String(tone)))
    throw new Error("Choose a valid caption tone.");
  const images = selected.map((id) =>
    draft.snapshot.images.find((image) => image.id === id),
  );
  if (images.some((image) => !image))
    throw new Error("Only this draft's frozen product images may be selected.");
  if (
    tone === "comparison" &&
    new Set(images.map((image) => image!.kit)).size < 2
  )
    throw new Error("Comparison needs images from two enabled kits.");
  if (typeof caption !== "string" || !caption.trim() || caption.length > 5000)
    throw new Error("Caption must contain 1–5,000 characters.");
  return {
    selected_images: selected as string[],
    tone: tone as Tone,
    caption: caption.trim(),
  };
}
export function selectedSources(draft: Draft) {
  return draft.selected_images.map(
    (id) => draft.snapshot.images.find((image) => image.id === id)!,
  );
}
export function validateCurrentKits(draft: Draft, product: MarketingProduct) {
  const enabled = new Set(product.images.map((image) => image.kit));
  if (selectedSources(draft).some((image) => !image || !enabled.has(image.kit)))
    throw new Error(
      "A selected kit is no longer enabled. Refresh from product and review the images before exporting.",
    );
}
export function safeAiInput(draft: Draft) {
  const { name, team, league, season, sleeve } = draft.snapshot;
  return {
    name,
    team,
    league,
    season,
    sleeve,
    kits: [...new Set(selectedSources(draft).map((image) => image.kit))],
    tone: draft.tone,
    mode: "sales_inquiry",
  };
}
