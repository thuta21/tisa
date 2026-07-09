"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, ScanLine, ShieldCheck } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import { useCart } from "@/lib/CartContext";
import { formatPriceAED, getJerseyById, getJerseyKitImage, kitImageFilters, kitOptions } from "@/lib/jerseys";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PaymentMethod = "kpay" | "wave";

const paymentMethods: { id: PaymentMethod; label: string; color: string }[] = [
  { id: "kpay", label: "KBZPay", color: "#005bab" },
  { id: "wave", label: "WavePay", color: "#f5c400" },
];

const uaeRegions = ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"];

export default function Checkout() {
  const { items, hydrated, subtotal, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("kpay");
  const [transactionId, setTransactionId] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hasStalePhysicalItems = items.some((item) => item.size !== "Font File" && (!item.productId || !item.variantId));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    if (hasStalePhysicalItems) {
      setSubmitError("Some jersey items were added before live stock tracking was enabled. Please remove and re-add them from the shop.");
      setSubmitting(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const reference = `TISA-${Date.now().toString().slice(-6)}`;
    const paymentReference = transactionId.trim();
    const deliveryFee = 0;
    const supabase = createSupabaseBrowserClient();

    const orderPayload = {
      order_number: reference,
      customer_name: String(formData.get("name") || "").trim(),
      customer_phone: String(formData.get("phone") || "").trim(),
      customer_email: String(formData.get("email") || "").trim() || null,
      country: String(formData.get("country") || "United Arab Emirates").trim(),
      region: String(formData.get("region") || "").trim(),
      delivery_address: String(formData.get("address") || "").trim(),
      subtotal,
      delivery_fee: deliveryFee,
      total: subtotal + deliveryFee,
      status: "verification_pending",
      delivery_status: "pending",
      payment_method: "bank_pay",
      customer_note: String(formData.get("note") || "").trim() || null,
      admin_note: null,
    };

    if (!orderPayload.customer_name || !orderPayload.customer_phone || !orderPayload.region || !orderPayload.delivery_address || !paymentReference) {
      setSubmitError("Please complete delivery details and payment transaction ID.");
      setSubmitting(false);
      return;
    }

    const orderResult = await supabase.from("orders").insert(orderPayload).select("id").single();
    if (orderResult.error || !orderResult.data) {
      setSubmitError(orderResult.error?.message ?? "Failed to create order.");
      setSubmitting(false);
      return;
    }

    const orderId = orderResult.data.id as string;
    const orderItems = items.flatMap((item) => {
      const isFont = item.size === "Font File";
      const jersey = !isFont ? getJerseyById(item.jerseyId) : null;
      if (!isFont && !item.productId) return [];

      const addOns = (item.customizationFee ?? 0) + (item.armBadgeFee ?? 0);
      const unitTotal = item.unitPrice + addOns;
      const kitLabel = isFont
        ? "Digital Font File"
        : item.variantName ?? kitOptions.find((kit) => kit.id === item.kit)?.label ?? item.kit;

      return [{
        order_id: orderId,
        product_id: isFont ? null : item.productId ?? null,
        variant_id: isFont ? null : item.variantId ?? null,
        product_name: isFont ? `${item.customName} Custom Font` : item.productName ?? jersey?.name ?? "Jersey",
        kit_name: kitLabel,
        size: item.size,
        custom_name: item.customName ?? null,
        custom_number: item.customNumber ?? null,
        font_slug: isFont ? item.customNumber ?? null : item.fontSlug ?? null,
        arm_badge: item.armBadge ?? null,
        customization_fee: item.customizationFee ?? 0,
        arm_badge_fee: item.armBadgeFee ?? 0,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: unitTotal * item.quantity,
      }];
    });

    const itemsResult = await supabase.from("order_items").insert(orderItems);
    if (itemsResult.error) {
      setSubmitError(itemsResult.error.message.includes("Insufficient stock")
        ? "One or more selected jerseys are no longer available in the requested quantity. Please update your bag and try again."
        : itemsResult.error.message);
      setSubmitting(false);
      return;
    }

    const safeTransactionId = paymentReference.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
    const paymentResult = await supabase.from("payment_proofs").insert({
      order_id: orderId,
      provider: paymentMethod,
      transaction_id: paymentReference,
      amount: subtotal,
      storage_path: `manual/${reference}-${safeTransactionId || "reference"}`,
      status: "pending",
    });
    if (paymentResult.error) {
      setSubmitError(paymentResult.error.message);
      setSubmitting(false);
      return;
    }

    await supabase.from("order_status_history").insert({
      order_id: orderId,
      from_status: null,
      to_status: "verification_pending",
      note: "Order submitted from checkout with payment transaction ID.",
    });

    setSubmittedOrder(reference);
    clearCart();
    setSubmitting(false);
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
              Your order has been saved. The admin team will verify your payment transaction ID and continue processing.
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
            {hasStalePhysicalItems && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Some jersey items need to be removed and added again before checkout because live stock tracking is now enabled.
              </div>
            )}
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
                    <input required name="phone" type="tel" inputMode="tel" autoComplete="tel" className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary" placeholder="+971 50 123 4567" />
                  </label>
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:col-span-2">
                    Email <span className="normal-case tracking-normal">(optional)</span>
                    <input name="email" type="email" autoComplete="email" className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary" placeholder="you@example.com" />
                  </label>
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Country
                    <select required name="country" defaultValue="United Arab Emirates" className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary">
                      <option>United Arab Emirates</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Region
                    <select required name="region" autoComplete="address-level1" defaultValue="" className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary">
                      <option value="" disabled>Select region</option>
                      {uaeRegions.map((region) => <option key={region}>{region}</option>)}
                    </select>
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
                      <strong className="text-lg">{formatPriceAED(subtotal)}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Transaction ID
                    <input required value={transactionId} onChange={(event) => setTransactionId(event.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary" placeholder="Enter wallet transaction ID" />
                  </label>
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Order note <span className="normal-case tracking-normal">(optional)</span>
                    <input name="note" className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary" placeholder="Any delivery or sizing note" />
                  </label>
                </div>
              </section>
            </div>

            <aside className="border-t border-border pt-6 lg:sticky lg:top-28 lg:rounded-xl lg:border lg:p-6">
              <h2 className="text-base font-bold">Order summary</h2>
              <div className="mt-5 max-h-72 space-y-4 overflow-y-auto pr-1">
                {items.map((item, index) => {
                  const isFont = item.size === "Font File";
                  const jersey = !isFont ? getJerseyById(item.jerseyId) : null;
                  if (!isFont && !jersey && !item.productName) return null;
                  const kitLabel = isFont ? "Digital Font File" : item.variantName ?? kitOptions.find((kit) => kit.id === item.kit)?.label;
                  const productName = item.productName ?? jersey?.name ?? "Jersey";
                  const imageSrc = item.imageUrl ?? (jersey ? getJerseyKitImage(jersey, item.kit) : "/assets/tisa-shirt.png");
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative h-20 w-16 shrink-0 rounded-md bg-muted/50 flex items-center justify-center overflow-hidden">
                        {isFont ? (
                          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                            <span className="font-extrabold text-xl font-display text-primary">Aa</span>
                            <span className="text-[7px] uppercase tracking-wider font-mono">.TTF File</span>
                          </div>
                        ) : (
                          <Image src={imageSrc} alt={productName} fill sizes="64px" priority={index === 0} className="object-contain p-1" style={{ filter: kitImageFilters[item.kit] }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {isFont ? `${item.customName} Custom Font` : productName}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {isFont ? "Digital Download" : `${kitLabel} / ${item.size} / Qty ${item.quantity}`}
                        </p>
                        {!isFont && (item.customName || item.customNumber) && (
                          <p className="text-[9px] text-muted-foreground">
                            Print: {[item.customName, item.customNumber].filter(Boolean).join(" ")}
                          </p>
                        )}
                        {!isFont && item.fontSlug && (
                          <p className="text-[9px] text-muted-foreground">
                            Font: {item.fontSlug}
                          </p>
                        )}
                        {!isFont && item.armBadge && (
                          <p className="text-[9px] text-muted-foreground">
                            Badge: {item.armBadge.toUpperCase()}
                          </p>
                        )}
                        <p className="mt-2 text-xs font-semibold">{formatPriceAED((item.unitPrice + (item.customizationFee ?? 0) + (item.armBadgeFee ?? 0)) * item.quantity)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <dl className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
                <div className="flex justify-between text-muted-foreground"><dt>Subtotal</dt><dd className="text-foreground">{formatPriceAED(subtotal)}</dd></div>
                <div className="flex justify-between text-muted-foreground"><dt>Delivery</dt><dd>Confirmed separately</dd></div>
              </dl>
              <div className="mt-5 flex items-end justify-between border-t border-border pt-5">
                <span className="text-sm font-semibold">Payment amount</span>
                <span className="text-xl font-bold">{formatPriceAED(subtotal)}</span>
              </div>
              <button
                type="submit"
                disabled={!transactionId.trim() || submitting}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {submitting ? "Submitting..." : "Submit Order"}
                <ShieldCheck size={15} />
              </button>
              {submitError && <p className="mt-3 text-center text-xs text-destructive">{submitError}</p>}
              <p className="mt-3 text-center text-[10px] leading-4 text-muted-foreground">Payment is reviewed manually by transaction ID.</p>
            </aside>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
