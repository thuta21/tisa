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
export type MarketingContacts = {
  facebook?: string;
  whatsapp?: string;
  phone?: string;
};
export function normalizeMarketingContacts(
  input: MarketingContacts,
): MarketingContacts {
  const result: MarketingContacts = {};
  try {
    const url = new URL(input.facebook ?? "");
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.href.length <= 300 &&
      [
        "facebook.com",
        "www.facebook.com",
        "m.facebook.com",
        "fb.com",
        "www.fb.com",
        "m.me",
      ].includes(url.hostname)
    )
      result.facebook = url.href;
  } catch {
    /* A missing or invalid contact must not become a caption link. */
  }
  const whatsapp = input.whatsapp?.replace(/[\s()+.-]/g, "") ?? "";
  if (/^[1-9]\d{7,14}$/.test(whatsapp)) result.whatsapp = whatsapp;
  const phone = input.phone?.trim() ?? "";
  if (
    /^\+?[\d\s().-]{7,24}$/.test(phone) &&
    phone.replace(/\D/g, "").length >= 7
  )
    result.phone = phone;
  return result;
}
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
  contacts: MarketingContacts = {},
  variation = 0,
) {
  const images = selectedImageIds
    ? snapshot.images.filter((image) => selectedImageIds.includes(image.id))
    : snapshot.images;
  const kits = [...new Set(images.map((image) => image.kit))]
    .map((kit) => `${kit[0].toUpperCase()}${kit.slice(1)} Kit`)
    .join(" / ");
  const hooks =
    tone === "fan"
      ? [
          `${snapshot.team} ပရိသတ်ဆို ကိုယ့်အသင်းရဲ့ jersey လေးနဲ့ အားပေးလိုက်ပါ ⚽`,
          `${snapshot.team} ကို အားပေးတဲ့သူတွေအတွက် ကိုယ့်အသင်းအရောင်နဲ့ jersey လေး ရွေးကြမယ် ⚽`,
          `ပွဲကြည့်ချိန်မှာ ကိုယ့်အသင်းကို ပိုအားပေးချင်သလား? ${snapshot.team} jersey လေးကို ကြည့်လိုက်ပါ ⚽`,
        ]
      : tone === "comparison"
        ? [
            `${snapshot.team} အတွက် ${kits} — ဘယ် kit လေးကို ဝတ်ပြီး အားပေးမလဲ? ⚽`,
            `${snapshot.team} jersey ရွေးနေတယ်ဆို ${kits} ဒီဇိုင်းတွေကို ယှဉ်ကြည့်လိုက်ပါ ⚽`,
            `ကိုယ့်စတိုင်နဲ့ လိုက်မယ့် ${snapshot.team} kit လေးကို ရွေးကြမယ် — ${kits} ⚽`,
          ]
        : [
            `ကိုယ့်အသင်းကို အားပေးဖို့ ${snapshot.team} jersey လေး ရွေးလိုက်ပါ ⚽`,
            `${snapshot.team} jersey ရှာနေတယ်ဆို ဒီဒီဇိုင်းလေးကို ကြည့်လိုက်ပါ ⚽`,
            `ပွဲနေ့မှာ ${snapshot.team} အရောင်နဲ့ အတူရှိနေဖို့ jersey လေးတစ်ထည် ရွေးကြမယ် ⚽`,
          ];
  const intro = hooks[variation] ?? hooks[0];
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
    contacts,
  );
}
export function templateCaptionOptions(
  snapshot: Snapshot,
  tone: Tone,
  origin?: string,
  selectedImageIds = snapshot.images.map((image) => image.id),
  contacts: MarketingContacts = {},
) {
  validateEdit({ snapshot }, selectedImageIds, tone, "Template caption");
  return [0, 1, 2].map((variation) =>
    templateCaption(
      snapshot,
      tone,
      origin,
      selectedImageIds,
      contacts,
      variation,
    ),
  );
}
export const marketingCallToAction =
  "မှာယူလိုပါက ကြိုက်တဲ့ team၊ kit နဲ့ size ကို ပြောပြီး Page Messenger၊ WhatsApp သို့မဟုတ် ဖုန်းကနေ စျေးနှုန်းနဲ့ ရရှိနိုင်မှုကို စုံစမ်းနိုင်ပါတယ်။";
export function finishCaption(
  body: string,
  snapshot: Snapshot,
  origin?: string,
  contacts: MarketingContacts = {},
) {
  const url = productUrl(snapshot, origin);
  const valid = normalizeMarketingContacts(contacts);
  const contactLines = [
    valid.facebook && `Facebook / Messenger: ${valid.facebook}`,
    valid.whatsapp && `WhatsApp: https://wa.me/${valid.whatsapp}`,
    valid.phone && `ဖုန်း: ${valid.phone}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `${body.trim()}\n\n${marketingCallToAction}${contactLines ? `\n${contactLines}` : ""}${url ? `\nဒီဇိုင်းကြည့်ရန်: ${url}` : ""}\n\n#TISA #FootballJersey`;
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
