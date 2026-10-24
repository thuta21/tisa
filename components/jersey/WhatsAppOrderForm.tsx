"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPriceAED } from "@/lib/jerseys";
import type { CatalogJerseyKit } from "@/lib/products";
import { validateCustomerProfile } from "@/lib/customer-profile";
import { trackWhatsAppHandoff } from "@/lib/analytics";

export default function WhatsAppOrderForm({ kit, kitId, productSlug, size, onSizeChange }: {
  kit: CatalogJerseyKit | null; kitId: string | null; productSlug: string; size: string; onSizeChange: (value: string) => void;
}) {
  const { user, isLoadingAuth } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [handoff, setHandoff] = useState<{ url: string; contact: string } | null>(null);
  const available = size ? (kit?.stockBySize[size] ?? 0) : 0;
  const sizes = kit?.sizeOptions ?? [];
  const selection = new URLSearchParams();
  if (kitId) selection.set("kit", kitId);
  if (size) selection.set("size", size);
  const destination = `/jersey/${productSlug}${selection.size ? `?${selection}` : ""}`;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    createSupabaseBrowserClient().from("profiles").select("display_name,phone").eq("id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        setName(data?.display_name ?? user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? "");
        setPhone(data?.phone ?? user.user_metadata?.phone ?? "");
        if (error) setError("Your contact details could not be loaded. You can enter them below.");
      });
    return () => { cancelled = true; };
  }, [user]);

  async function order(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setHandoff(null);
    const invalid = validateCustomerProfile(name, phone);
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/orders/whatsapp", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: kit?.variantId, size, quantity, customerName: name, customerPhone: phone }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to prepare your order.");
      setHandoff(data);
      if (kit?.variantId) await trackWhatsAppHandoff({ itemId: kit.variantId, name: kit.variantName ?? productSlug, variant: kitId, size, quantity, price: kit.price });
      window.location.assign(data.url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to open WhatsApp. Please try again."); }
    finally { setBusy(false); }
  }

  return <div className="mt-7 border-t border-border pt-6">
    {kit && <p className="text-2xl font-semibold text-primary">{formatPriceAED(kit.price)}</p>}
    <fieldset className="mt-5" disabled={busy}>
      <legend className="text-sm font-medium">Select size</legend>
      <div className="mt-3 flex flex-wrap gap-2">{sizes.map(value => <button key={value} type="button" disabled={!kit?.stockBySize[value]} aria-label={`${value}${!kit?.stockBySize[value] ? " — out of stock" : ""}`} aria-pressed={size === value} onClick={() => { onSizeChange(value); setHandoff(null); setError(""); }}
        className={`min-h-11 min-w-12 rounded-xl border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${size === value ? "border-primary bg-primary text-white" : "border-border"}`}>
        {value}{!kit?.stockBySize[value] && <span className="sr-only"> — out of stock</span>}
      </button>)}</div>
      {sizes.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No sizes are currently listed for this kit.</p>}
      {sizes.length > 0 && !kit?.available && <p className="mt-3 text-sm text-muted-foreground">This kit is currently out of stock.</p>}
    </fieldset>
    {isLoadingAuth ? <p className="mt-5 text-sm text-muted-foreground">Checking your account…</p> : !user ?
      <Link href={`/login?next=${encodeURIComponent(destination)}`} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white"><MessageCircle size={18} /> Log in to Order Now</Link> :
      <form onSubmit={order} className="mt-5 space-y-4">
        <div><label htmlFor="order-quantity" className="text-sm font-medium">Quantity</label><input id="order-quantity" type="number" min={1} max={Math.min(99, available || 1)} value={quantity} onChange={e => { setQuantity(Number(e.target.value)); setHandoff(null); }} required disabled={busy} className="mt-2 block min-h-11 w-24 rounded-xl border border-border bg-white px-3" /></div>
        <div><label htmlFor="order-name" className="text-sm font-medium">Your name</label><input id="order-name" autoComplete="name" value={name} onChange={e => { setName(e.target.value); setHandoff(null); }} required minLength={2} maxLength={100} disabled={busy} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-white px-3" /></div>
        <div><label htmlFor="order-phone" className="text-sm font-medium">Phone number</label><input id="order-phone" type="tel" autoComplete="tel" placeholder="+971 50 123 4567" value={phone} onChange={e => { setPhone(e.target.value); setHandoff(null); }} required maxLength={25} disabled={busy} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-white px-3" /></div>
        {size && quantity > 0 && kit && <p className="text-sm">Product subtotal: <strong>{formatPriceAED(kit.price * quantity)}</strong></p>}
        <button disabled={busy || !size || quantity < 1 || quantity > Math.min(99, available)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><MessageCircle size={18} />{busy ? "Preparing WhatsApp…" : "Order Now"}</button>
      </form>}
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {handoff && <button type="button" onClick={() => window.location.assign(handoff.url)} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary">Open WhatsApp with {handoff.contact} again</button>}
    <p className="mt-4 text-xs leading-6 text-muted-foreground">Order Now opens WhatsApp with your name, phone and selected product details. Tap Send in WhatsApp to contact our available team. Stock, delivery and payment are confirmed by the team; opening WhatsApp does not reserve stock or place a confirmed order.</p>
  </div>;
}
