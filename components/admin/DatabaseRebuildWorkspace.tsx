"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Run = {
  id: string;
  status: "backed_up" | "cleaned" | "orders_restored";
  backup_sha256: string;
  source_counts: Record<string, number>;
  created_at: string;
};
type State = {
  runs: Run[];
  counts: { products: number; inventory: number; orders: number; paymentProofs: number };
};

const button = "inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

async function request(body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch("/api/admin/rebuild", body ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  } : undefined);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Migration request failed.");
  return data;
}

function saveBackup(backup: unknown, id: string) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `TISA_Order_Records_Backup_${id}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function DatabaseRebuildWorkspace({
  onOpenProducts,
  onOpenInventory,
}: {
  onOpenProducts: () => void;
  onOpenInventory: () => void;
}) {
  const [state, setState] = useState<State | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const next = await request() as unknown as State;
    setState(next);
    setSelectedId((current) => current || next.runs[0]?.id || "");
  }, []);
  useEffect(() => {
    let active = true;
    request().then((result) => {
      if (!active) return;
      const next = result as unknown as State;
      setState(next);
      setSelectedId(next.runs[0]?.id || "");
    }).catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, []);
  const run = useMemo(() => state?.runs.find((item) => item.id === selectedId) ?? state?.runs[0], [selectedId, state]);

  if (!state && !error) {
    return <section aria-busy="true" aria-live="polite" className="mt-6 space-y-5"><span className="sr-only">Loading migration status</span><div className="h-14 w-80 max-w-full animate-pulse rounded-xl bg-neutral-200"/><div className="grid gap-4 lg:grid-cols-4">{[0,1,2,3].map(item=><div key={item} className="h-60 animate-pulse rounded-xl bg-neutral-200"/>)}</div></section>;
  }

  async function act(action: "prepare" | "clean" | "restore") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await request(action === "prepare" ? { action } : {
        action,
        id: run?.id,
        sha256: run?.backup_sha256,
        confirmation,
      });
      if (action === "prepare") {
        saveBackup(result.backup, String(result.id));
        setSelectedId(String(result.id));
        setMessage("Order backup downloaded and rebuild checkpoint created.");
      } else if (action === "clean") {
        setConfirmation("");
        setMessage("Commerce data cleaned. Import products next, then inventory.");
      } else {
        setMessage(`Orders restored. ${String(result.unmappedItems ?? 0)} item references could not be mapped.`);
      }
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-6 space-y-5">
    <div>
      <h2 className="text-xl font-bold">Database Migration Center</h2>
      <p className="text-sm text-muted-foreground">Run the rebuild in order. Reference settings, profiles, fonts and storage objects are retained.</p>
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-lg border p-3 text-sm">{message}</p>}
    <div className="grid gap-4 lg:grid-cols-4">
      <article className="space-y-3 rounded-xl border p-4">
        <p className="text-xs font-bold uppercase tracking-wider">1 · Backup</p>
        <p className="text-sm">Orders: {state?.counts.orders ?? "–"} · Proof records: {state?.counts.paymentProofs ?? "–"}</p>
        <button className={button} disabled={busy} onClick={() => void act("prepare")}>Create & download backup</button>
      </article>
      <article className="space-y-3 rounded-xl border p-4">
        <p className="text-xs font-bold uppercase tracking-wider">2 · Clean</p>
        <p className="text-sm">Requires the latest unchanged backup and removes commerce data plus every Auth/profile account except the admin running this rebuild.</p>
        <input className="h-10 w-full rounded-lg border bg-background px-3 text-sm" placeholder="CLEAN TISA DATA" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        <button className={button} disabled={busy || run?.status !== "backed_up" || confirmation !== "CLEAN TISA DATA"} onClick={() => void act("clean")}>Clean commerce data</button>
      </article>
      <article className="space-y-3 rounded-xl border p-4">
        <p className="text-xs font-bold uppercase tracking-wider">3 · Products & inventory</p>
        <p className="text-sm">Products: {state?.counts.products ?? "–"} · Inventory rows: {state?.counts.inventory ?? "–"}</p>
        <a className={button} href="/api/admin/products/template">Download product template</a>
        <button className={button} onClick={onOpenProducts}>Open product import</button>
        <a className={button} href="/api/admin/inventory/template">Download inventory template</a>
        <button className={button} onClick={onOpenInventory}>Open inventory import</button>
      </article>
      <article className="space-y-3 rounded-xl border p-4">
        <p className="text-xs font-bold uppercase tracking-wider">4 · Restore orders</p>
        <p className="text-sm">References remap by stable ID, SKU, or product slug + sleeve + kit. Stock is not deducted twice.</p>
        <button className={button} disabled={busy || run?.status !== "cleaned" || !state?.counts.products || !state?.counts.inventory} onClick={() => void act("restore")}>Restore backed-up orders</button>
      </article>
    </div>
    {state?.runs.length ? <label className="block max-w-xl text-sm">Rebuild checkpoint
      <select className="mt-2 h-10 w-full rounded-lg border bg-background px-3" value={run?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>
        {state.runs.map((item) => <option key={item.id} value={item.id}>{new Date(item.created_at).toLocaleString()} · {item.status} · {item.id}</option>)}
      </select>
    </label> : null}
  </section>;
}
