import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { adminClient } from "@/lib/inventory/server";
import { supabaseUrl } from "@/lib/supabase/config";
import {
  marketingSelect,
  toMarketingProduct,
  templateCaption,
  validateEdit,
  validateCurrentKits,
  normalizeMarketingContacts,
} from "./content";
import type { Asset, Draft, Job, MarketingProduct, Snapshot } from "./types";
export type MarketingDb = Awaited<ReturnType<typeof adminClient>>;
export const bucket = "marketing-assets";
export function marketingContacts() {
  return normalizeMarketingContacts({
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_PAGE_URL,
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE,
  });
}
export function check<T>(
  data: T,
  error: { message: string; code?: string } | null,
): T {
  if (error)
    throw Object.assign(new Error(error.message), { code: error.code });
  return data;
}
export async function activeProduct(
  db: MarketingDb,
  id: string,
): Promise<MarketingProduct> {
  const { data, error } = await db
    .from("products")
    .select(marketingSelect)
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();
  check(data, error);
  if (!data)
    throw new Error("Product is no longer active. Select another product.");
  return toMarketingProduct(
    data as unknown as Parameters<typeof toMarketingProduct>[0],
  );
}
export async function getDraft(db: MarketingDb, id: string) {
  const { data, error } = await db
    .from("marketing_drafts")
    .select("*")
    .eq("id", id)
    .single();
  return check(data, error) as Draft;
}
export function trustedSource(path: string) {
  if (/^\/assets\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp)$/i.test(path))
    return { local: path };
  let key = path;
  if (/^https?:/i.test(path)) {
    const url = new URL(path);
    const base = new URL(supabaseUrl);
    const prefix = "/storage/v1/object/public/product-images/";
    if (
      url.origin !== base.origin ||
      !url.pathname.startsWith(prefix) ||
      url.search ||
      url.hash
    )
      throw new Error(
        "Unsupported product image URL. Use the product-images bucket.",
      );
    key = decodeURIComponent(url.pathname.slice(prefix.length));
  }
  if (
    !key ||
    key.startsWith("/") ||
    key
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..") ||
    /[\\?#\u0000-\u001f]/.test(key)
  )
    throw new Error("Unsupported product image path.");
  return { key };
}
export async function sourceBytes(db: MarketingDb, path: string) {
  const source = trustedSource(path);
  let bytes: Buffer;
  if (source.local)
    bytes = await readFile(join(process.cwd(), "public", source.local));
  else {
    const { data, error } = await db.storage
      .from("product-images")
      .download(source.key!);
    check(data, error);
    if (!data || data.size > 10 * 1024 * 1024)
      throw new Error("Product image is missing or larger than 10 MB.");
    bytes = Buffer.from(await data.arrayBuffer());
  }
  if (bytes.length > 10 * 1024 * 1024)
    throw new Error("Product image is larger than 10 MB.");
  const image = sharp(bytes, { limitInputPixels: 40_000_000 });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
    throw new Error("Product image must be JPEG, PNG or WebP.");
  return image
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#f4f3f0" })
    .jpeg({ quality: 90 })
    .toBuffer();
}
export async function freezeSnapshot(
  db: MarketingDb,
  draftId: string,
  product: MarketingProduct,
) {
  const paths: string[] = [];
  try {
    const images = [];
    const assets: Omit<Asset, "id" | "created_at">[] = [];
    for (const source of product.images) {
      const bytes = await sourceBytes(db, source.path);
      const id = `${source.id}:${randomUUID()}`;
      const path = `${draftId}/sources/${randomUUID()}.jpg`;
      const { error } = await db.storage
        .from(bucket)
        .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
      check(null, error);
      paths.push(path);
      images.push({ ...source, id, path });
      assets.push({
        draft_id: draftId,
        revision: 1,
        kind: "source",
        path,
        mime: "image/jpeg",
        bytes: bytes.length,
        source_id: id,
      });
    }
    if (!images.length)
      throw new Error("This product has no enabled kit images.");
    return { snapshot: { ...product, images } as Snapshot, assets, paths };
  } catch (error) {
    if (paths.length) await db.storage.from(bucket).remove(paths);
    throw error;
  }
}
export async function createDraft(
  db: MarketingDb,
  productId: string,
  origin?: string,
) {
  const product = await activeProduct(db, productId);
  const id = randomUUID();
  const frozen = await freezeSnapshot(db, id, product);
  try {
    const { data, error } = await db
      .from("marketing_drafts")
      .insert({
        id,
        product_id: productId,
        snapshot: frozen.snapshot,
        selected_images: frozen.snapshot.images.slice(0, 4).map((i) => i.id),
        caption: templateCaption(
          frozen.snapshot,
          "showcase",
          origin,
          frozen.snapshot.images.slice(0, 4).map((i) => i.id),
          marketingContacts(),
        ),
      })
      .select("*")
      .single();
    check(data, error);
    const saved = await db.from("marketing_assets").insert(frozen.assets);
    check(null, saved.error);
    return data as Draft;
  } catch (error) {
    await db.from("marketing_drafts").delete().eq("id", id);
    await db.storage.from(bucket).remove(frozen.paths);
    throw error;
  }
}
export async function draftDetail(db: MarketingDb, id: string) {
  const draft = await getDraft(db, id);
  const [assetResult, jobResult] = await Promise.all([
    db
      .from("marketing_assets")
      .select("*")
      .eq("draft_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("marketing_jobs")
      .select("*")
      .eq("draft_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const assets = check(assetResult.data, assetResult.error) as Asset[];
  const paths = draft.snapshot.images.map((image) => image.path);
  const { data: signed, error } = await db.storage
    .from(bucket)
    .createSignedUrls(paths, 3600);
  check(signed, error);
  return {
    draft,
    assets,
    jobs: check(jobResult.data, jobResult.error),
    images: Object.fromEntries(
      paths.map((path, i) => [path, signed?.[i]?.signedUrl ?? ""]),
    ),
  };
}
export async function saveDraft(
  db: MarketingDb,
  draft: Draft,
  body: Record<string, unknown>,
) {
  if (draft.archived)
    throw new Error("Restore or duplicate an archived draft before editing.");
  if (body.revision !== draft.revision)
    throw Object.assign(new Error("Draft changed. Reload before continuing."), {
      code: "40001",
    });
  const edit = validateEdit(
    draft,
    body.selected_images,
    body.tone,
    body.caption,
  );
  if (body.status !== "draft" && body.status !== "ready")
    throw new Error("Choose draft or ready status.");
  if (body.status === "ready")
    validateCurrentKits(
      { ...draft, ...edit },
      await activeProduct(db, draft.product_id ?? ""),
    );
  // Content changes are saved as draft by the DB trigger. A second explicit review marks that revision ready.
  const result = await db
    .from("marketing_drafts")
    .update({ ...edit, status: body.status })
    .eq("id", draft.id)
    .eq("revision", draft.revision)
    .select("*")
    .maybeSingle();
  check(result.data, result.error);
  if (!result.data)
    throw Object.assign(new Error("Draft changed. Reload before continuing."), {
      code: "40001",
    });
  return result.data as Draft;
}

export function startedJob(data: unknown): Job {
  const value = Array.isArray(data) ? data[0] : data;
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    typeof value.id !== "string"
  )
    throw new Error("Could not start the operation. Refresh and retry.");
  return value as Job;
}
