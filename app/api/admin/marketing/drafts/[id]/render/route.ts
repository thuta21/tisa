import { adminClient } from "@/lib/inventory/server";
import {
  activeProduct,
  getDraft,
  check,
  bucket,
  startedJob,
} from "@/lib/marketing/server";
import { renderFrame } from "@/lib/marketing/frame";
import { renderVideo } from "@/lib/marketing/video";
import { validateCurrentKits } from "@/lib/marketing/content";
import type { Job } from "@/lib/marketing/types";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex",
  };
  const db = await adminClient(request).catch((error) => error as Error);
  if (db instanceof Error)
    return Response.json(
      { error: db.message },
      { status: /Authentication/.test(db.message) ? 401 : 403, headers },
    );
  let job: Job | undefined, uploaded: string | undefined;
  try {
    const { id } = await params;
    const raw = await request.text();
    if (raw.length > 4096) throw new Error("Request is too large.");
    const body = JSON.parse(raw),
      kind = body.kind;
    if (kind !== "poster" && kind !== "video")
      throw new Error("Choose poster or video export.");
    const draft = await getDraft(db, id);
    if (draft.revision !== body.revision)
      throw Object.assign(
        new Error("Draft changed. Reload before continuing."),
        { code: "40001" },
      );
    if (draft.archived) throw new Error("Restore the draft before exporting.");
    validateCurrentKits(draft, await activeProduct(db, draft.product_id ?? ""));
    if (kind === "video" && draft.selected_images.length < 2)
      throw new Error("Video needs 2–4 different images.");
    const cached = await db
      .from("marketing_assets")
      .select("id")
      .eq("draft_id", id)
      .eq("revision", draft.revision)
      .eq("kind", kind)
      .limit(1);
    check(cached.data, cached.error);
    if (cached.data?.[0])
      return Response.json(
        { assetId: cached.data[0].id, cached: true },
        { headers },
      );
    const started = await db.rpc("start_marketing_job", {
      p_draft: id,
      p_revision: draft.revision,
      p_kind: kind,
    });
    job = startedJob(check(started.data, started.error));
    const frames: Buffer[] = [];
    for (const sourceId of kind === "poster"
      ? draft.selected_images.slice(0, 1)
      : draft.selected_images) {
      const image = draft.snapshot.images.find((i) => i.id === sourceId);
      if (!image)
        throw new Error("Frozen image is missing. Refresh the draft.");
      const source = await db.storage.from(bucket).download(image.path);
      frames.push(
        await renderFrame(
          draft,
          image,
          Buffer.from(await check(source.data, source.error)!.arrayBuffer()),
          kind === "video",
        ),
      );
    }
    const bytes = kind === "poster" ? frames[0] : await renderVideo(frames);
    const mime = kind === "poster" ? "image/png" : "video/mp4";
    uploaded = `${id}/exports/${job.id}.${kind === "poster" ? "png" : "mp4"}`;
    check(
      null,
      (
        await db.storage
          .from(bucket)
          .upload(uploaded, bytes, { contentType: mime })
      ).error,
    );
    const finished = await db.rpc("finish_marketing_job", {
      p_job: job.id,
      p_asset: { path: uploaded, mime, bytes: bytes.length },
    });
    check(finished.data, finished.error);
    if (!finished.data)
      throw new Error(
        "Draft changed or render expired. Reload and retry the current revision.",
      );
    return Response.json({ jobId: job.id }, { headers });
  } catch (error) {
    if (job)
      await db.rpc("finish_marketing_job", {
        p_job: job.id,
        p_error: (error as Error).message.slice(0, 500),
      });
    if (uploaded) await db.storage.from(bucket).remove([uploaded]);
    const e = error as { code?: string; message: string };
    return Response.json(
      { error: e.message },
      { status: e.code === "40001" || e.code === "23505" ? 409 : 400, headers },
    );
  }
}
