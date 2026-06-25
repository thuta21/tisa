"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, ImageUp, ScanLine, ShieldCheck } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import { useCart } from "@/lib/CartContext";
import { formatPriceMMK, getJerseyById, getJerseyKitImage, kitImageFilters, kitOptions } from "@/lib/jerseys";

type PaymentMethod = "kpay" | "wave";

const paymentMethods: { id: PaymentMethod; label: string; color: string }[] = [
  { id: "kpay", label: "KBZPay", color: "#005bab" },
  { id: "wave", label: "WavePay", color: "#f5c400" },
];

export default function Checkout() {
  const { items, hydrated, subtotal, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("kpay");
  const [proofPreview, setProofPreview] = useState("");
  const [proofName, setProofName] = useState("");
  const [fileError, setFileError] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState("");

  useEffect(() => () => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
  }, [proofPreview]);

  const handleProofChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("Payment proof must be smaller than 5 MB.");
      return;
    }
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(URL.createObjectURL(file));
    setProofName(file.name);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reference = `TISA-${Date.now().toString().slice(-6)}`;
    setSubmittedOrder(reference);
    clearCart();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submittedOrder) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-6 pb-16 pt-28">
          <div className="w-full max-w-lg text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check size={25} />
            </div>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Payment review pending</p>
            <h1 className="mt-2 text-3xl font-bold">Order received</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Your payment proof is ready for verification. This demo keeps the confirmation in this browser only until the order API is connected.
            </p>
            <div className="mx-auto mt-7 max-w-xs rounded-lg border border-border px-5 py-4">
              <span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Order reference</span>
              <strong className="mt-1 block text-lg tracking-[0.1em]">{submittedOrder}</strong>
            </div>
            <Link href="/shop" className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground">
              Continue Shopping
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-6 pb-16 pt-28 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-[520px] animate-pulse rounded-xl bg-muted" />
          <div className="h-80 animate-pulse rounded-xl bg-muted" />
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-6 pb-16 pt-28 text-center">
          <div>
            <h1 className="text-2xl font-bold">Your bag is empty</h1>
            <p className="mt-2 text-sm text-muted-foreground">Add a kit before starting checkout.</p>
            <Link href="/shop" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground">Browse Roster</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 px-5 pb-14 pt-28 sm:px-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-6xl">
          <div className="mb-8 border-b border-border pb-6">
            <Link href="/cart" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft size={13} /> Back to bag
            </Link>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Checkout</h1>
            <p className="mt-2 text-sm text-muted-foreground">Delivery details and mobile wallet payment.</p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="space-y-10">
              <section>
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>
                  <h2 className="text-lg font-bold">Delivery details</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Full name
                    <input required name="name" autoComplete="name" className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary" placeholder="Your full name" />
                  </label>
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Phone number
                    <input required name="phone" type="tel" inputMode="tel" autoComplete="tel" pattern="^(09|\+?959)[0-9 ]{7,11}$" className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary" placeholder="09 123 456 789" />
                  </label>
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:col-span-2">
                    Email <span className="normal-case tracking-normal">(optional)</span>
                    <input name="email" type="email" autoComplete="email" className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary" placeholder="you@example.com" />
                  </label>
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    City / Region
                    <input required name="region" autoComplete="address-level1" className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary" placeholder="Yangon" />
                  </label>
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Township
                    <input required name="township" autoComplete="address-level2" className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary" placeholder="Kamayut" />
                  </label>
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:col-span-2">
                    Delivery address
                    <textarea required name="address" autoComplete="street-address" rows={3} className="resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm font-normal normal-case leading-6 tracking-normal text-foreground outline-none focus:border-primary" placeholder="Street, building, floor, and nearby landmark" />
                  </label>
                </div>
              </section>

              <section className="border-t border-border pt-8">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>
                  <h2 className="text-lg font-bold">Mobile wallet payment</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex h-14 items-center gap-3 rounded-lg border px-4 text-left transition-colors ${paymentMethod === method.id ? "border-primary bg-muted" : "border-border hover:border-primary/40"}`}
                    >
                      <span className="size-3 rounded-full" style={{ background: method.color }} />
                      <span className="text-sm font-semibold">{method.label}</span>
                      {paymentMethod === method.id && <Check size={15} className="ml-auto" />}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 rounded-xl border border-dashed border-border p-5 sm:grid-cols-[140px_1fr] sm:items-center">
                  <div className="flex aspect-square items-center justify-center rounded-lg bg-muted">
                    <div className="text-center text-muted-foreground">
                      <ScanLine size={32} className="mx-auto" />
                      <span className="mt-2 block text-[9px] font-semibold uppercase tracking-[0.16em]">Demo QR</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{paymentMethod === "kpay" ? "KBZPay" : "WavePay"} merchant account</p>
                    <h3 className="mt-1 text-base font-bold">Payment account pending setup</h3>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">The real merchant QR and account name will replace this demo block before launch.</p>
                    <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3">
                      <span className="text-xs text-muted-foreground">Amount</span>
                      <strong className="text-lg">{formatPriceMMK(subtotal)}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Transaction ID
                    <input required value={transactionId} onChange={(event) => setTransactionId(event.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary" placeholder="Enter wallet transaction ID" />
                  </label>
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Payment screenshot
                    <input required type="file" accept="image/png,image/jpeg,image/webp" onChange={handleProofChange} className="sr-only" id="payment-proof" />
                    <span className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm font-normal normal-case tracking-normal text-foreground hover:border-primary/50">
                      <ImageUp size={15} />
                      <span className="truncate">{proofName || "Choose image"}</span>
                    </span>
                  </label>
                </div>
                {fileError && <p className="mt-2 text-xs text-destructive">{fileError}</p>}
                {proofPreview && (
                  <div className="relative mt-4 h-40 overflow-hidden rounded-lg border border-border bg-muted">
                    <Image src={proofPreview} alt="Payment screenshot preview" fill unoptimized className="object-contain" />
                  </div>
                )}
              </section>
            </div>

            <aside className="border-t border-border pt-6 lg:sticky lg:top-28 lg:rounded-xl lg:border lg:p-6">
              <h2 className="text-base font-bold">Order summary</h2>
              <div className="mt-5 max-h-72 space-y-4 overflow-y-auto pr-1">
                {items.map((item, index) => {
                  const jersey = getJerseyById(item.jerseyId);
                  if (!jersey) return null;
                  const kitLabel = kitOptions.find((kit) => kit.id === item.kit)?.label;
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative h-20 w-16 shrink-0 rounded-md bg-muted/50">
                        <Image src={getJerseyKitImage(jersey, item.kit)} alt={jersey.name} fill sizes="64px" priority={index === 0} className="object-contain p-1" style={{ filter: kitImageFilters[item.kit] }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{jersey.name}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{kitLabel} / {item.size} / Qty {item.quantity}</p>
                        <p className="mt-2 text-xs font-semibold">{formatPriceMMK(item.unitPrice * item.quantity)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <dl className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
                <div className="flex justify-between text-muted-foreground"><dt>Subtotal</dt><dd className="text-foreground">{formatPriceMMK(subtotal)}</dd></div>
                <div className="flex justify-between text-muted-foreground"><dt>Delivery</dt><dd>Confirmed separately</dd></div>
              </dl>
              <div className="mt-5 flex items-end justify-between border-t border-border pt-5">
                <span className="text-sm font-semibold">Payment amount</span>
                <span className="text-xl font-bold">{formatPriceMMK(subtotal)}</span>
              </div>
              <button
                type="submit"
                disabled={!proofPreview || !transactionId.trim()}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Submit Order
                <ShieldCheck size={15} />
              </button>
              <p className="mt-3 text-center text-[10px] leading-4 text-muted-foreground">Payment is not automatically verified in demo mode.</p>
            </aside>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
