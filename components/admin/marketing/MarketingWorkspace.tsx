"use client";
/* Private signed media URLs are displayed directly; Next image optimization would persist them in a public cache. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  Film,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { templateCaption } from "@/lib/marketing/content";
import type {
  Asset,
  Draft,
  Job,
  MarketingProduct,
  Tone,
} from "@/lib/marketing/types";
const base = "/api/admin/marketing";
async function api(path: string, body?: unknown, method = "POST") {
  const response = await fetch(
    `${base}/${path}`,
    body === undefined
      ? { cache: "no-store" }
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(result.error ?? "Request failed."), {
      setupRequired: result.setupRequired,
    });
  return result;
}
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40";
const input =
  "min-h-12 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-base";
type Detail = {
  draft: Draft;
  assets: Asset[];
  jobs: Job[];
  images: Record<string, string>;
};
export default function MarketingWorkspace({
  initialProduct,
}: {
  initialProduct?: string;
}) {
  const [drafts, setDrafts] = useState<Draft[]>([]),
    [products, setProducts] = useState<MarketingProduct[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]),
    [detail, setDetail] = useState<Detail | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
      initialProduct ? [initialProduct] : [],
    ),
    [batch, setBatch] = useState<string[]>([]);
  const [query, setQuery] = useState(""),
    [draftQuery, setDraftQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [league, setLeague] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(""),
    [message, setMessage] = useState(""),
    [setup, setSetup] = useState(false),
    [failure, setFailure] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false),
    [aiSetupOpen, setAiSetupOpen] = useState(false),
    [origin, setOrigin] = useState(""),
    [step, setStep] = useState(1);
  const [selectedImages, setSelectedImages] = useState<string[]>([]),
    [tone, setTone] = useState<Tone>("showcase"),
    [caption, setCaption] = useState(""),
    [variations, setVariations] = useState<string[]>([]);
  const [replaceProduct, setReplaceProduct] = useState("");
  const requestVersion = useRef(0);
  const report = useCallback((error: unknown) => {
    setMessage((error as Error).message);
    setFailure(true);
    if ((error as { setupRequired?: boolean }).setupRequired) setSetup(true);
  }, []);
  const load = useCallback(async () => {
    const result = await api("drafts");
    const all: Draft[] = [...result.drafts];
    if (result.drafts.length === 100)
      for (let offset = 100; ; offset += 100) {
        const page = await api(`drafts?offset=${offset}`);
        all.push(...page.drafts);
        if (page.drafts.length < 100) break;
      }
    setDrafts(all);
    setJobs(result.jobs);
    setAiConfigured(result.aiConfigured);
    setOrigin(result.siteUrl);
    setSetup(false);
  }, []);
  const open = useCallback(async (id: string) => {
    const version = ++requestVersion.current;
    const result: Detail = await api(`drafts/${id}`);
    if (version !== requestVersion.current) return;
    setDetail(result);
    setSelectedImages(result.draft.selected_images);
    setTone(result.draft.tone);
    setCaption(result.draft.caption);
    setVariations([]);
    setReplaceProduct("");
  }, []);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const all: MarketingProduct[] = [];
        for (let offset = 0; ; offset += 100) {
          const page = await api(`products?offset=${offset}`);
          all.push(...page.products);
          if (page.products.length < 100) break;
        }
        if (!mounted) return;
        setProducts(all);
        await load();
      } catch (error) {
        if (mounted) report(error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [load, report]);
  const draft = detail?.draft;
  const dirty =
    !!draft &&
    (caption !== draft.caption ||
      tone !== draft.tone ||
      JSON.stringify(selectedImages) !== JSON.stringify(draft.selected_images));
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function run(label: string, operation: () => Promise<unknown>) {
    setBusy(label);
    setMessage("");
    setFailure(false);
    try {
      await operation();
    } catch (error) {
      report(error);
    } finally {
      setBusy("");
    }
  }
  async function save(ready = false) {
    if (!draft) return;
    let saved = draft;
    if (dirty || !ready) {
      const result = await api(
        `drafts/${draft.id}`,
        {
          revision: draft.revision,
          selected_images: selectedImages,
          tone,
          caption,
          status: "draft",
        },
        "PATCH",
      );
      saved = result.draft;
    }
    if (ready) {
      const result = await api(
        `drafts/${draft.id}`,
        {
          revision: saved.revision,
          selected_images: selectedImages,
          tone,
          caption,
          status: "ready",
        },
        "PATCH",
      );
      saved = result.draft;
    }
    await open(saved.id);
    await load();
    setMessage(ready ? "Reviewed and ready to export." : "Draft saved.");
    return saved;
  }
  async function download(assetId: string) {
    const result = await api(`assets/${assetId}`);
    const link = document.createElement("a");
    link.href = result.url;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  async function exportOne(kind: "poster" | "video") {
    if (!draft) return;
    await api(`drafts/${draft.id}/render`, { revision: draft.revision, kind });
    const current: Detail = await api(`drafts/${draft.id}`);
    setDetail(current);
    await load();
    const asset = current.assets.find(
      (a) => a.kind === kind && a.revision === draft.revision,
    );
    if (asset) await download(asset.id);
    setMessage(
      `${kind === "poster" ? "Poster" : "Video"} ready. If your browser opens a preview, use Share or Save to keep the file.`,
    );
  }
  const guardSwitch = () =>
    !dirty || window.confirm("Leave this draft and discard unsaved changes?");
  const visibleProducts = products.filter(
    (p) =>
      (!league || p.league === league) &&
      [p.name, p.team, p.season]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const visibleDrafts = drafts.filter(
    (d) =>
      (status === "archived"
        ? d.archived
        : !d.archived && (status === "all" || d.status === status)) &&
      [d.snapshot.name, d.caption]
        .join(" ")
        .toLowerCase()
        .includes(draftQuery.toLowerCase()),
  );
  const runningJobs = jobs.filter(
    (j) => j.state === "running" && new Date(j.expires_at) > new Date(),
  );
  return (
    <div className="mx-auto max-w-[1500px]">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            TISA admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Marketing Studio
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Create Burmese captions, Facebook posters and TikTok slideshows from
            your collection. Export files for posting in your social apps.
          </p>
        </div>
        <button
          className={button}
          disabled={!!busy || loading}
          onClick={() =>
            run("Refreshing", async () => {
              await load();
              if (draft && !dirty) await open(draft.id);
            })
          }
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>
      {message && (
        <div
          role={failure ? "alert" : "status"}
          className={`mt-5 break-words rounded-xl border p-4 text-sm ${failure ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}
        >
          {message}
        </div>
      )}
      {busy && (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm">
          <LoaderCircle
            className="animate-spin motion-reduce:animate-none"
            size={18}
          />
          {busy}… Keep this page open while exporting. Completed exports are
          saved.
        </p>
      )}
      {loading ? (
        <div role="status" className="mt-6 grid gap-5 lg:grid-cols-2">
          <span className="sr-only">Loading Marketing Studio</span>
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-96 animate-pulse rounded-2xl bg-black/5 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : setup ? (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-xl font-semibold">Marketing setup required</h2>
          <p className="mt-3 text-sm leading-7">
            Apply the Marketing Studio SQL migration in Supabase, create the
            private marketing-assets bucket through that migration, and reload
            this page. Other admin tools remain available.
          </p>
        </section>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="rounded-full border bg-white px-3 py-2">
              AI:{" "}
              {aiConfigured
                ? "Connected · ready to generate"
                : "Not connected · sales templates available"}
            </span>
            <span className="rounded-full border bg-white px-3 py-2">
              {runningJobs.length} running ·{" "}
              {jobs.filter((j) => j.state === "failed").length} recent failures
              ·{" "}
              {jobs
                .filter((j) => j.kind === "ai")
                .reduce((n, j) => n + j.input_tokens + j.output_tokens, 0)}{" "}
              recent AI tokens
            </span>
          </div>
          {!origin && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"
            >
              Set NEXT_PUBLIC_SITE_URL to your production origin to include
              product links. Captions and exports still work without a link.
            </p>
          )}
          <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside
              className={`min-w-0 space-y-6 ${draft ? "hidden xl:block" : ""}`}
            >
              <section className="rounded-2xl border border-border bg-white p-4">
                <h2 className="text-lg font-semibold">Choose products</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Select up to six. Each product gets its own independent draft.
                </p>
                <label className="mt-4 block text-sm">
                  Search products
                  <input
                    className={`${input} mt-2`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Team or jersey"
                  />
                </label>
                <label className="mt-3 block text-sm">
                  League
                  <select
                    className={`${input} mt-2`}
                    value={league}
                    onChange={(e) => setLeague(e.target.value)}
                  >
                    <option value="">All leagues</option>
                    {[...new Set(products.map((p) => p.league))].map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <div className="mt-3 max-h-72 overflow-y-auto overscroll-contain divide-y divide-border">
                  {visibleProducts.map((p) => (
                    <label
                      key={p.id}
                      className="flex min-h-14 cursor-pointer items-start gap-3 py-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-5 shrink-0 accent-black"
                        checked={selectedProducts.includes(p.id)}
                        disabled={
                          !!busy ||
                          !p.images.length ||
                          (!selectedProducts.includes(p.id) &&
                            selectedProducts.length >= 6)
                        }
                        onChange={(e) =>
                          setSelectedProducts(
                            e.target.checked
                              ? [...selectedProducts, p.id]
                              : selectedProducts.filter((id) => id !== p.id),
                          )
                        }
                      />
                      <span className="min-w-0 break-words">
                        {p.name}
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {p.images.length} enabled kit images
                        </span>
                      </span>
                    </label>
                  ))}
                  {!visibleProducts.length && (
                    <p className="py-5 text-sm text-muted-foreground">
                      No matching active products.
                    </p>
                  )}
                </div>
                <button
                  className={`${button} mt-4 w-full bg-primary text-primary-foreground`}
                  disabled={!!busy || !selectedProducts.length}
                  onClick={() => {
                    if (guardSwitch())
                      run("Creating drafts", async () => {
                        const result = await api("drafts", {
                          productIds: selectedProducts,
                        });
                        await load();
                        if (result.drafts[0]) {
                          await open(result.drafts[0].id);
                          setStep(1);
                        }
                        setSelectedProducts([]);
                        if (result.errors.length) {
                          setFailure(true);
                          setMessage(
                            result.errors
                              .map((e: { error: string }) => e.error)
                              .join(" · "),
                          );
                        } else
                          setMessage(`${result.drafts.length} drafts created.`);
                      });
                  }}
                >
                  Create {selectedProducts.length || ""} drafts
                </button>
              </section>
              <section className="rounded-2xl border border-border bg-white p-4">
                <h2 className="text-lg font-semibold">Content library</h2>
                <label className="mt-3 block text-sm">
                  Search drafts
                  <input
                    className={`${input} mt-2`}
                    value={draftQuery}
                    onChange={(e) => setDraftQuery(e.target.value)}
                  />
                </label>
                <label className="mt-3 block text-sm">
                  Status
                  <select
                    className={`${input} mt-2`}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {["all", "draft", "ready", "exported", "archived"].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s[0].toUpperCase() + s.slice(1)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <div className="mt-3 max-h-96 divide-y divide-border overflow-y-auto">
                  {visibleDrafts.map((d) => (
                    <div key={d.id} className="flex gap-2 py-2">
                      <input
                        aria-label={`Select ${d.snapshot.name} for bulk export`}
                        type="checkbox"
                        className="my-3 size-5 shrink-0 accent-black"
                        disabled={
                          !!busy ||
                          d.archived ||
                          d.status === "draft" ||
                          (!batch.includes(d.id) && batch.length >= 6)
                        }
                        checked={batch.includes(d.id)}
                        onChange={(e) =>
                          setBatch(
                            e.target.checked
                              ? [...batch, d.id]
                              : batch.filter((id) => id !== d.id),
                          )
                        }
                      />
                      <button
                        className={`min-h-14 min-w-0 flex-1 rounded-xl px-3 py-2 text-left ${draft?.id === d.id ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted"}`}
                        disabled={!!busy}
                        onClick={() => {
                          if (guardSwitch())
                            run("Opening draft", async () => {
                              await open(d.id);
                              setStep(1);
                            });
                        }}
                      >
                        <span className="block truncate text-sm font-medium">
                          {d.snapshot.name}
                        </span>
                        <span className="mt-1 block text-xs capitalize text-muted-foreground">
                          {d.archived ? "Archived" : d.status} · revision{" "}
                          {d.revision}
                        </span>
                      </button>
                    </div>
                  ))}
                  {!visibleDrafts.length && (
                    <p className="py-5 text-sm text-muted-foreground">
                      No drafts yet.
                    </p>
                  )}
                </div>
                {batch.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {(["poster", "video"] as const).map((kind) => (
                      <button
                        key={kind}
                        className={button}
                        disabled={!!busy || dirty}
                        onClick={() =>
                          run(
                            `Exporting ${batch.length} ${kind}s`,
                            async () => {
                              const errors = [];
                              for (const id of batch) {
                                const row = drafts.find((d) => d.id === id);
                                if (!row) continue;
                                try {
                                  await api(`drafts/${id}/render`, {
                                    kind,
                                    revision: row.revision,
                                  });
                                } catch (error) {
                                  errors.push(
                                    `${row.snapshot.name}: ${(error as Error).message}`,
                                  );
                                }
                              }
                              await load();
                              if (draft) await open(draft.id);
                              setBatch([]);
                              setFailure(!!errors.length);
                              setMessage(
                                errors.length
                                  ? errors.join(" · ")
                                  : "Exports saved. Open each draft to download its files.",
                              );
                            },
                          )
                        }
                      >
                        Export selected {kind}s
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </aside>
            <section className="min-w-0">
              {!draft ? (
                <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
                  <ImageIcon className="mx-auto" size={28} />
                  <h2 className="mt-4 text-xl font-semibold">
                    Start with a product
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Choose products or open a saved draft. No social account
                    connection is needed.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    className={`${button} mb-4 xl:hidden`}
                    disabled={!!busy}
                    onClick={() => {
                      if (guardSwitch()) {
                        setDetail(null);
                        setStep(1);
                      }
                    }}
                  >
                    Back to content library
                  </button>
                  <div className="rounded-2xl border border-border bg-white p-4 sm:p-6">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {draft.archived ? "Archived" : draft.status} ·
                          revision {draft.revision}
                          {dirty ? " · Unsaved changes" : ""}
                        </p>
                        <h2 className="mt-2 break-words text-2xl font-semibold">
                          {draft.snapshot.name}
                        </h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={button}
                          disabled={!!busy || dirty}
                          onClick={() =>
                            run("Duplicating draft", async () => {
                              const result = await api(
                                `drafts/${draft.id}/duplicate`,
                                { revision: draft.revision },
                              );
                              await load();
                              await open(result.draft.id);
                              setStep(1);
                            })
                          }
                        >
                          Duplicate
                        </button>
                        <button
                          className={button}
                          disabled={!!busy || dirty}
                          onClick={() =>
                            run("Updating archive", async () => {
                              await api(`drafts/${draft.id}/archive`, {
                                revision: draft.revision,
                              });
                              await load();
                              await open(draft.id);
                            })
                          }
                        >
                          {draft.archived ? "Restore" : "Archive"}
                        </button>
                      </div>
                    </div>
                    <nav
                      aria-label="Content editor steps"
                      className="my-6 grid grid-cols-3 gap-2"
                    >
                      {[
                        "Product & images",
                        "Caption & design",
                        "Preview & export",
                      ].map((label, i) => (
                        <button
                          key={label}
                          type="button"
                          aria-current={step === i + 1 ? "step" : undefined}
                          onClick={() => setStep(i + 1)}
                          className={`min-h-14 rounded-xl border px-2 py-2 text-xs sm:text-sm ${step === i + 1 ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                        >
                          {i + 1}. {label}
                        </button>
                      ))}
                    </nav>
                    {step === 1 && (
                      <>
                        <p className="text-sm leading-6 text-muted-foreground">
                          Choose 1–4 frozen images. The first becomes the
                          poster; the slideshow follows this exact order.
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {draft.snapshot.images.map((image) => (
                            <label
                              key={image.id}
                              className={`relative cursor-pointer overflow-hidden rounded-xl border p-2 ${selectedImages.includes(image.id) ? "border-primary ring-1 ring-primary" : "border-border"}`}
                            >
                              <img
                                src={detail.images[image.path]}
                                alt={`${draft.snapshot.name}, ${image.label}`}
                                className="aspect-square w-full object-contain"
                              />
                              <span className="flex min-h-11 items-center gap-2 text-xs capitalize">
                                <input
                                  type="checkbox"
                                  className="size-5 accent-black"
                                  checked={selectedImages.includes(image.id)}
                                  disabled={
                                    !!busy ||
                                    draft.archived ||
                                    (!selectedImages.includes(image.id) &&
                                      selectedImages.length >= 4)
                                  }
                                  onChange={(e) =>
                                    setSelectedImages(
                                      e.target.checked
                                        ? [...selectedImages, image.id]
                                        : selectedImages.filter(
                                            (id) => id !== image.id,
                                          ),
                                    )
                                  }
                                />
                                {image.label}
                              </span>
                            </label>
                          ))}
                        </div>
                        <ol className="mt-4 space-y-2">
                          {selectedImages.map((id, i) => (
                            <li
                              key={id}
                              className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-1"
                            >
                              <span className="text-xs capitalize">
                                {i + 1}.{" "}
                                {
                                  draft.snapshot.images.find(
                                    (im) => im.id === id,
                                  )?.label
                                }
                              </span>
                              <div className="flex">
                                <button
                                  aria-label={`Move image ${i + 1} earlier`}
                                  className="grid size-11 place-items-center disabled:opacity-30"
                                  disabled={!!busy || draft.archived || i === 0}
                                  onClick={() =>
                                    setSelectedImages((ids) => {
                                      const next = [...ids];
                                      [next[i - 1], next[i]] = [
                                        next[i],
                                        next[i - 1],
                                      ];
                                      return next;
                                    })
                                  }
                                >
                                  <ArrowUp size={17} />
                                </button>
                                <button
                                  aria-label={`Move image ${i + 1} later`}
                                  className="grid size-11 place-items-center disabled:opacity-30"
                                  disabled={
                                    !!busy ||
                                    draft.archived ||
                                    i === selectedImages.length - 1
                                  }
                                  onClick={() =>
                                    setSelectedImages((ids) => {
                                      const next = [...ids];
                                      [next[i + 1], next[i]] = [
                                        next[i],
                                        next[i + 1],
                                      ];
                                      return next;
                                    })
                                  }
                                >
                                  <ArrowDown size={17} />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ol>
                        <details className="mt-6 border-t border-border pt-4">
                          <summary className="min-h-11 cursor-pointer text-sm font-medium">
                            Refresh or replace source product
                          </summary>
                          <p className="my-3 text-xs leading-6 text-muted-foreground">
                            Explicitly fetch the latest active product and
                            freeze its images. This resets the draft to showcase
                            and needs review again. Existing captions stay
                            editable.
                          </p>
                          <label className="block text-sm">
                            Source product
                            <select
                              className={`${input} mt-2`}
                              value={replaceProduct}
                              onChange={(e) =>
                                setReplaceProduct(e.target.value)
                              }
                            >
                              <option value="">Current product</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            className={`${button} mt-3`}
                            disabled={!!busy || dirty || draft.archived}
                            onClick={() =>
                              run("Refreshing product snapshot", async () => {
                                await api(`drafts/${draft.id}/refresh`, {
                                  revision: draft.revision,
                                  ...(replaceProduct
                                    ? { productId: replaceProduct }
                                    : {}),
                                });
                                await open(draft.id);
                                await load();
                                setMessage(
                                  "Snapshot refreshed. Check the caption before marking ready.",
                                );
                              })
                            }
                          >
                            <RefreshCw size={16} />
                            Refresh snapshot
                          </button>
                        </details>
                      </>
                    )}
                    {step === 2 && (
                      <>
                        <label className="block text-sm font-medium">
                          Caption tone
                          <select
                            className={`${input} mt-2`}
                            disabled={draft.archived || !!busy}
                            value={tone}
                            onChange={(e) => setTone(e.target.value as Tone)}
                          >
                            <option value="showcase">Sales showcase</option>
                            <option value="fan">Fan pitch</option>
                            <option value="comparison">
                              Kit comparison (two kits required)
                            </option>
                          </select>
                        </label>
                        <div className="my-4 flex flex-wrap gap-2">
                          <button
                            className={button}
                            disabled={!!busy || draft.archived}
                            onClick={() =>
                              setCaption(
                                templateCaption(
                                  draft.snapshot,
                                  tone,
                                  origin || undefined,
                                  selectedImages,
                                ),
                              )
                            }
                          >
                            Use sales caption template
                          </button>
                          <button
                            className={button}
                            disabled={!!busy || draft.archived}
                            onClick={() => {
                              if (!aiConfigured) {
                                setAiSetupOpen(true);
                                return;
                              }
                              void run(
                                "Generating sales captions",
                                async () => {
                                  const saved = dirty ? await save() : draft;
                                  if (!saved) return;
                                  const result = await api(
                                    `drafts/${draft.id}/ai`,
                                    { revision: saved.revision },
                                  );
                                  setVariations(result.variations);
                                  await load();
                                  setMessage(
                                    "Three sales caption options are ready. Choose one to use it.",
                                  );
                                },
                              );
                            }}
                          >
                            <Sparkles size={16} />
                            {!aiConfigured
                              ? "Set up AI"
                              : dirty
                                ? "Save & generate with AI"
                                : "Generate with AI"}
                          </button>
                        </div>
                        <p className="mb-4 text-xs leading-5 text-muted-foreground">
                          {aiConfigured
                            ? "Generation saves your current changes first. Choose a suggestion to replace the caption."
                            : "AI မချိတ်ဆက်ရသေးပါ။ Set up AI မှာ ချိတ်ဆက်နည်းကြည့်နိုင်ပြီး sales caption template ကို ယခုသုံးနိုင်ပါတယ်။"}
                        </p>
                        {aiSetupOpen && !aiConfigured && (
                          <section
                            role="status"
                            className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7"
                          >
                            <h3 className="font-semibold">
                              Connect OpenAI for caption generation
                            </h3>
                            <p className="mt-2">
                              Server မှာ OpenAI API key ထည့်ပြီးမှ AI caption
                              ထုတ်နိုင်ပါမယ်။ Key ကို ဒီ editor သို့မဟုတ် chat
                              ထဲ ပို့စရာမလိုပါ။
                            </p>
                            <ol className="mt-3 list-decimal space-y-2 pl-5">
                              <li>
                                <a
                                  href="https://platform.openai.com/api-keys"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                >
                                  OpenAI dashboard
                                </a>{" "}
                                မှာ API key ယူပါ။
                              </li>
                              <li>
                                Local အတွက် project ရဲ့ <code>.env.local</code>{" "}
                                မှာ{" "}
                                <code className="break-all">
                                  OPENAI_API_KEY
                                </code>{" "}
                                ထည့်ပြီး dev server ကို restart လုပ်ပါ။
                              </li>
                              <li>
                                Hosted site အတွက် Vercel Environment Variables
                                မှာ key ထည့်ပြီး redeploy လုပ်ပါ။ ပြီးရင် ဒီ
                                page ရဲ့ Refresh ကို နှိပ်ပါ။
                              </li>
                            </ol>
                            <p className="mt-3 text-xs">
                              AI သုံးမှသာ OpenAI usage ကျသင့်ပါမယ်။ Templates
                              ကို key မလိုဘဲ သုံးနိုင်ပါတယ်။
                            </p>
                          </section>
                        )}
                        <label className="block text-sm font-medium">
                          Burmese caption
                          <textarea
                            className={`${input} mt-2 min-h-64 py-3 leading-8`}
                            maxLength={5000}
                            value={caption}
                            disabled={draft.archived || !!busy}
                            onChange={(e) => setCaption(e.target.value)}
                          />
                        </label>
                        <p className="mt-2 text-right text-xs text-muted-foreground">
                          {caption.length}/5,000
                        </p>
                        <div className="mt-5 space-y-3">
                          {variations.map((text, i) => (
                            <div
                              key={i}
                              className="rounded-xl border border-border p-4"
                            >
                              <p className="whitespace-pre-wrap break-words text-sm leading-8">
                                {text}
                              </p>
                              <button
                                className={`${button} mt-3`}
                                onClick={() => setCaption(text)}
                              >
                                Use option {i + 1}
                              </button>
                            </div>
                          ))}
                        </div>
                        <p className="mt-5 text-sm text-muted-foreground">
                          Poster & video: TISA branding · English product
                          details · original jersey photos.
                        </p>
                      </>
                    )}
                    {step === 3 && (
                      <>
                        <p className="mb-4 text-sm leading-6 text-muted-foreground">
                          {dirty
                            ? "Save to refresh the preview. Export uses only the reviewed, saved revision."
                            : "Poster preview uses the same renderer as the exported file."}
                        </p>
                        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
                          <div className="min-w-0">
                            <img
                              key={`${draft.id}-${draft.revision}`}
                              src={`${base}/drafts/${draft.id}/preview?revision=${draft.revision}`}
                              alt="Facebook poster preview"
                              className="aspect-[4/5] w-full rounded-xl border border-border object-contain"
                            />
                            <p className="mt-2 text-xs text-muted-foreground">
                              Facebook · 1080×1350 PNG
                            </p>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium">TikTok scene order</h3>
                            <ol className="mt-3 grid grid-cols-2 gap-2">
                              {selectedImages.map((id, i) => {
                                const image = draft.snapshot.images.find(
                                  (im) => im.id === id,
                                )!;
                                return (
                                  <li
                                    key={id}
                                    className="rounded-xl border border-border p-2"
                                  >
                                    <img
                                      src={detail.images[image.path]}
                                      alt={`Scene ${i + 1}: ${image.label}`}
                                      className="aspect-[9/16] max-h-40 w-full object-contain"
                                    />
                                    <p className="mt-2 text-xs capitalize">
                                      {i + 1}. {image.label}
                                    </p>
                                  </li>
                                );
                              })}
                            </ol>
                            <p className="mt-3 text-xs leading-6 text-muted-foreground">
                              720×1280 · 24fps ·{" "}
                              {Math.max(9, selectedImages.length * 3)} seconds ·
                              silent slideshow. Add music in your social app.
                            </p>
                            <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-muted p-4 text-sm leading-8">
                              {caption}
                            </p>
                          </div>
                        </div>
                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                          <button
                            className={button}
                            disabled={!!busy}
                            onClick={() =>
                              run("Copying caption", async () => {
                                await navigator.clipboard.writeText(caption);
                                setMessage("Caption copied.");
                              })
                            }
                          >
                            <Copy size={16} />
                            Copy caption
                          </button>
                          <button
                            className={button}
                            disabled={
                              !!busy ||
                              dirty ||
                              draft.archived ||
                              draft.status === "draft"
                            }
                            onClick={() =>
                              run("Rendering poster", () => exportOne("poster"))
                            }
                          >
                            <ImageIcon size={16} />
                            Download poster
                          </button>
                          <button
                            className={button}
                            disabled={
                              !!busy ||
                              dirty ||
                              draft.archived ||
                              draft.status === "draft" ||
                              selectedImages.length < 2
                            }
                            onClick={() =>
                              run("Rendering slideshow", () =>
                                exportOne("video"),
                              )
                            }
                          >
                            <Film size={16} />
                            Download video
                          </button>
                        </div>
                        {selectedImages.length < 2 && (
                          <p className="mt-3 text-sm text-muted-foreground">
                            Add a second different image to enable video export.
                          </p>
                        )}
                        <h3 className="mt-7 font-semibold">Saved exports</h3>
                        <div className="mt-3 space-y-2">
                          {detail.assets
                            .filter((a) => a.kind !== "source")
                            .map((a) => (
                              <div
                                key={a.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
                              >
                                <span className="text-sm capitalize">
                                  {a.kind} · revision {a.revision} ·{" "}
                                  {(a.bytes / 1024 / 1024).toFixed(1)} MB
                                </span>
                                <button
                                  className={button}
                                  disabled={!!busy}
                                  onClick={() =>
                                    run("Preparing download", () =>
                                      download(a.id),
                                    )
                                  }
                                >
                                  <Download size={16} />
                                  Download
                                </button>
                              </div>
                            ))}
                        </div>
                        <h3 className="mt-7 font-semibold">
                          Recent operations
                        </h3>
                        <ul className="mt-3 space-y-2">
                          {detail.jobs.map((j) => (
                            <li
                              key={j.id}
                              className="break-words rounded-xl bg-muted p-3 text-xs leading-6"
                            >
                              <span className="capitalize">
                                {j.kind} ·{" "}
                                {j.state === "running" &&
                                new Date(j.expires_at) < new Date()
                                  ? "expired — retry available"
                                  : j.state}
                              </span>
                              {j.finished_at &&
                                ` · ${Math.round((Date.parse(j.finished_at) - Date.parse(j.created_at)) / 1000)}s`}
                              {j.error && (
                                <span className="block text-red-800">
                                  {j.error}
                                </span>
                              )}
                              {j.kind === "ai" &&
                                ` · ${j.input_tokens + j.output_tokens} tokens`}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <footer className="mt-6 flex flex-wrap justify-between gap-3 border-t border-border pt-5">
                      <div className="flex gap-2">
                        <button
                          className={button}
                          disabled={step === 1 || !!busy}
                          onClick={() => setStep(step - 1)}
                        >
                          Back
                        </button>
                        <button
                          className={button}
                          disabled={step === 3 || !!busy}
                          onClick={() => setStep(step + 1)}
                        >
                          Next
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={button}
                          disabled={!!busy || draft.archived}
                          onClick={() => run("Saving draft", () => save())}
                        >
                          Save draft
                        </button>
                        <button
                          className={`${button} bg-primary text-primary-foreground`}
                          disabled={!!busy || draft.archived}
                          onClick={() => run("Marking ready", () => save(true))}
                        >
                          <Check size={16} />
                          Mark ready
                        </button>
                      </div>
                    </footer>
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
