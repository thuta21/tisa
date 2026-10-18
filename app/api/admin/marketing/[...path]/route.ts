import { randomUUID } from "node:crypto";
import { adminClient } from "@/lib/inventory/server";
import {
  createDraft,
  draftDetail,
  getDraft,
  activeProduct,
  freezeSnapshot,
  saveDraft,
  check,
  bucket,
  startedJob,
} from "@/lib/marketing/server";
import { marketingSelect, toMarketingProduct } from "@/lib/marketing/content";
import { getSiteUrl } from "@/lib/site";
import type { Asset, Draft } from "@/lib/marketing/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
type Context = { params: Promise<{ path: string[] }> };
const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex",
};
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers });
const uuid = (value: unknown) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function errorResponse(error: unknown) {
  const e = error as { message?: string; code?: string };
  const missing =
    e.code === "42P01" || e.code === "PGRST205" || e.code === "PGRST202";
  const status = missing
    ? 503
    : e.code === "40001" || e.code === "23505"
      ? 409
      : /Authentication/.test(e.message ?? "")
        ? 401
        : /Admin access|Forbidden/.test(e.message ?? "")
          ? 403
          : 400;
  return json(
    {
      error: missing
        ? "Marketing Studio needs the database migration. Apply 20261018120000_marketing_studio.sql."
        : (e.message ?? "Marketing request failed."),
      setupRequired: missing,
    },
    status,
  );
}
async function handle(request: Request, context: Context) {
  try {
    const db = await adminClient(request);
    const path = (await context.params).path;
    const [section, id, action] = path;
    if (request.method === "GET") {
      if (section === "products") {
        const url = new URL(request.url);
        const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
        const result = await db
          .from("products")
          .select(marketingSelect)
          .eq("status", "active")
          .order("name")
          .range(offset, offset + 99);
        return json({
          products: (check(result.data, result.error) ?? []).map((row) =>
            toMarketingProduct(
              row as unknown as Parameters<typeof toMarketingProduct>[0],
            ),
          ),
        });
      }
      if (section === "drafts" && !id) {
        const offset = Math.max(
          0,
          Number(new URL(request.url).searchParams.get("offset")) || 0,
        );
        const [drafts, jobs] = await Promise.all([
          db
            .from("marketing_drafts")
            .select("*")
            .order("updated_at", { ascending: false })
            .range(offset, offset + 99),
          db
            .from("marketing_jobs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100),
        ]);
        return json({
          drafts: check(drafts.data, drafts.error),
          jobs: check(jobs.data, jobs.error),
          aiConfigured: Boolean(process.env.OPENAI_API_KEY),
          siteUrl: getSiteUrl()?.origin ?? "",
        });
      }
      if (section === "drafts" && uuid(id) && action === "preview") {
        const draft = await getDraft(db, id);
        const image = draft.snapshot.images.find(
          (i) => i.id === draft.selected_images[0],
        );
        if (!image) throw new Error("Choose a product image first.");
        const source = await db.storage.from(bucket).download(image.path);
        const { renderFrame } = await import("@/lib/marketing/frame");
        const frame = await renderFrame(
          draft,
          image,
          Buffer.from(await check(source.data, source.error)!.arrayBuffer()),
        );
        return new Response(new Uint8Array(frame), {
          headers: { ...headers, "Content-Type": "image/png" },
        });
      }
      if (section === "drafts" && uuid(id) && !action)
        return json(await draftDetail(db, id));
      if (section === "assets" && uuid(id)) {
        const result = await db
          .from("marketing_assets")
          .select("*")
          .eq("id", id)
          .single();
        const asset = check(result.data, result.error) as Asset;
        const signed = await db.storage
          .from(bucket)
          .createSignedUrl(asset.path, 300, {
            download: `tisa-${asset.kind}-${asset.id}.${asset.kind === "video" ? "mp4" : asset.kind === "poster" ? "png" : "jpg"}`,
          });
        return json({ url: check(signed.data, signed.error)!.signedUrl });
      }
      return json({ error: "Not found" }, 404);
    }
    if (Number(request.headers.get("content-length") ?? 0) > 32_768)
      throw new Error("Request is too large.");
    const raw = await request.text();
    if (raw.length > 32_768) throw new Error("Request is too large.");
    const body = JSON.parse(raw || "{}");
    if (section !== "drafts") return json({ error: "Not found" }, 404);
    if (request.method === "POST" && !id) {
      if (
        !Array.isArray(body.productIds) ||
        !body.productIds.length ||
        body.productIds.length > 6 ||
        body.productIds.some((v: unknown) => !uuid(v))
      )
        throw new Error("Choose 1–6 active products.");
      const created: Draft[] = [],
        errors: { productId: string; error: string }[] = [];
      for (const productId of [...new Set<string>(body.productIds)]) {
        try {
          created.push(await createDraft(db, productId, getSiteUrl()?.origin));
        } catch (error) {
          errors.push({ productId, error: (error as Error).message });
        }
      }
      return json({ drafts: created, errors });
    }
    if (!uuid(id)) return json({ error: "Not found" }, 404);
    const draft = await getDraft(db, id);
    if (request.method === "PATCH" && !action)
      return json({ draft: await saveDraft(db, draft, body) });
    if (request.method !== "POST")
      return json({ error: "Method not allowed" }, 405);
    if (body.revision !== draft.revision)
      throw Object.assign(
        new Error("Draft changed. Reload before continuing."),
        { code: "40001" },
      );
    if (action === "archive") {
      const result = await db
        .from("marketing_drafts")
        .update({ archived: !draft.archived })
        .eq("id", id)
        .eq("revision", draft.revision)
        .select("id")
        .maybeSingle();
      check(result.data, result.error);
      if (!result.data)
        throw Object.assign(
          new Error("Draft changed. Reload before continuing."),
          { code: "40001" },
        );
      return json({ ok: true });
    }
    if (action === "duplicate" || action === "refresh") {
      if (draft.archived && action === "refresh")
        throw new Error("Restore the draft before refreshing.");
      if (action === "duplicate") {
        const product = await activeProduct(db, draft.product_id ?? "");
        // Copy from the original frozen sources, keeping the duplicated draft independent.
        const newId = randomUUID(),
          paths: string[] = [];
        try {
          const assets: Record<string, unknown>[] = [],
            images = [];
          for (const image of draft.snapshot.images) {
            const file = await db.storage.from(bucket).download(image.path);
            const blob = check(file.data, file.error)!;
            const path = `${newId}/sources/${randomUUID()}.jpg`,
              bytes = Buffer.from(await blob.arrayBuffer());
            check(
              null,
              (
                await db.storage
                  .from(bucket)
                  .upload(path, bytes, { contentType: "image/jpeg" })
              ).error,
            );
            paths.push(path);
            images.push({ ...image, path });
            assets.push({
              draft_id: newId,
              revision: 1,
              source_id: image.id,
              path,
              kind: "source",
              mime: "image/jpeg",
              bytes: bytes.length,
            });
          }
          const result = await db
            .from("marketing_drafts")
            .insert({
              id: newId,
              product_id: product.id,
              snapshot: { ...draft.snapshot, images },
              selected_images: draft.selected_images,
              tone: draft.tone,
              caption: draft.caption,
            })
            .select("*")
            .single();
          check(result.data, result.error);
          check(null, (await db.from("marketing_assets").insert(assets)).error);
          return json({ draft: result.data });
        } catch (error) {
          await db.from("marketing_drafts").delete().eq("id", newId);
          if (paths.length) await db.storage.from(bucket).remove(paths);
          throw error;
        }
      }
      const product = await activeProduct(
        db,
        uuid(body.productId) ? body.productId : (draft.product_id ?? ""),
      );
      const frozen = await freezeSnapshot(db, id, product);
      try {
        check(
          null,
          (
            await db.from("marketing_assets").insert(
              frozen.assets.map((a) => ({
                ...a,
                revision: draft.revision + 1,
              })),
            )
          ).error,
        );
        const updated = await db
          .from("marketing_drafts")
          .update({
            product_id: product.id,
            snapshot: frozen.snapshot,
            selected_images: frozen.snapshot.images
              .slice(0, 4)
              .map((i) => i.id),
            tone: "showcase",
          })
          .eq("id", id)
          .eq("revision", draft.revision)
          .select("*")
          .maybeSingle();
        check(updated.data, updated.error);
        if (!updated.data)
          throw Object.assign(
            new Error("Draft changed. Reload before continuing."),
            { code: "40001" },
          );
        return json({ draft: updated.data });
      } catch (error) {
        await db.from("marketing_assets").delete().in("path", frozen.paths);
        await db.storage.from(bucket).remove(frozen.paths);
        throw error;
      }
    }
    if (action !== "ai") return json({ error: "Not found" }, 404);
    if (!process.env.OPENAI_API_KEY)
      throw new Error("AI is not configured. Templates are available.");
    const started = await db.rpc("start_marketing_job", {
      p_draft: id,
      p_revision: draft.revision,
      p_kind: "ai",
      p_ai_limit: Math.max(
        1,
        Math.min(100, Number(process.env.OPENAI_MARKETING_DAILY_LIMIT) || 20),
      ),
    });
    const job = startedJob(check(started.data, started.error));
    try {
      const { generateCaptions } = await import("@/lib/marketing/ai");
      const generated = await generateCaptions(draft, getSiteUrl()?.origin);
      const finished = await db.rpc("finish_marketing_job", {
        p_job: job.id,
        p_result: { variations: generated.variations },
        p_input_tokens: generated.inputTokens,
        p_output_tokens: generated.outputTokens,
      });
      check(finished.data, finished.error);
      if (!finished.data)
        throw new Error(
          "Draft changed or operation expired. Reload and retry.",
        );
      return json({ jobId: job.id, variations: generated.variations });
    } catch (error) {
      await db.rpc("finish_marketing_job", {
        p_job: job.id,
        p_error: (error as Error).message.slice(0, 500),
      });
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
