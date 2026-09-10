"use client";

import { useState } from "react";
import type { ProductImportPreview } from "@/lib/product-import";

const button = "inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted disabled:cursor-wait disabled:opacity-50";

export default function ProductExcelImport({ onComplete }: { onComplete: () => Promise<void> }) {
  const [preview, setPreview] = useState<(ProductImportPreview & { id: string | null }) | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/products/import", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPreview(data);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview?.id) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/products/import", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: preview.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await onComplete();
      setPreview(null);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className={`${button} cursor-pointer`} aria-busy={busy}>
        {busy ? "Reading Excel…" : "Import products Excel"}
        <input
          aria-label="Import products Excel"
          className="sr-only"
          type="file"
          accept=".xlsx"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </label>
      <a className={button} href="/api/admin/products/template">Product template</a>
      {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}

      {preview && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/45 p-3 sm:p-6">
          <section role="dialog" aria-modal="true" aria-label="Product import preview" className="mx-auto min-h-full w-full max-w-4xl rounded-2xl border bg-background p-5 shadow-2xl sm:min-h-0 sm:p-7">
            <div className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Excel validation</p>
                <h3 className="mt-1 text-xl font-bold">Product import preview</h3>
              </div>
              <p className="text-sm text-muted-foreground">{preview.createCount} new · {preview.updateCount} updates · {preview.issues.length} errors</p>
            </div>

            {preview.issues.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-red-200 bg-red-50 p-4">
                {preview.issues.map((issue, index) => <p className="text-sm text-red-800" key={index}>Row {issue.rowNumber}, {issue.field}: {issue.message}</p>)}
              </div>
            )}

            <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-xl border border-border">
              {preview.rows.map((row) => (
                <div className="flex flex-col gap-1 border-b border-border p-3 text-sm last:border-b-0 sm:flex-row sm:items-center sm:justify-between" key={row.rowNumber}>
                  <strong>{row.rowNumber}. {row.name}</strong>
                  <span className="text-muted-foreground">{row.existingProductId ? "Update" : "Create"} · {row.status}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button className={button} disabled={busy} onClick={() => setPreview(null)}>Close</button>
              <button className={`${button} border-primary bg-primary text-primary-foreground hover:bg-primary/90`} aria-busy={busy} disabled={busy || !preview.id || preview.issues.length > 0} onClick={() => void commit()}>
                {busy ? "Committing…" : "Commit products"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
