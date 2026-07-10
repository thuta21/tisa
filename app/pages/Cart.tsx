"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import { useCart } from "@/lib/CartContext";
import {
  formatPriceAED,
  getJerseyById,
  getJerseyKitImage,
  kitImageFilters,
  kitOptions,
} from "@/lib/jerseys";

export default function Cart() {
  const { items, hydrated, itemCount, subtotal, updateQuantity, removeItem } = useCart();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 px-5 pb-14 pt-28 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between gap-4 border-b border-border pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your selection</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Shopping bag</h1>
            </div>
            <span className="text-sm text-muted-foreground">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
          </div>

          {!hydrated ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="h-48 animate-pulse rounded-lg bg-muted" />
              <div className="h-64 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
              <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-border">
                <ShoppingBag size={27} className="text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold">Your bag is empty</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Browse the roster and choose a kit, size, and quantity to get started.
              </p>
              <Link href="/shop" className="mt-7 rounded-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground">
                Browse jerseys
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              <div className="divide-y divide-border border-y border-border">
                {items.map((item, index) => {
                  const isFont = item.size === "Font File";
                  const jersey = !isFont ? getJerseyById(item.jerseyId) : null;
                  if (!isFont && !jersey && !item.productName) return null;
                  const kitLabel = isFont ? "Digital Font File" : (kitOptions.find((kit) => kit.id === item.kit)?.label ?? item.kit);
                  const productName = item.productName ?? jersey?.name ?? "Jersey";
                  const productHref = `/jersey/${item.productSlug ?? item.jerseyId}`;
                  const imageSrc = item.imageUrl ?? (jersey ? getJerseyKitImage(jersey, item.kit) : "/assets/tisa-shirt.png");

                  return (
                    <article key={item.id} className="grid grid-cols-[92px_minmax(0,1fr)] gap-4 py-5 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:gap-6">
                      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted/50 flex items-center justify-center">
                        {isFont ? (
                          <div className="flex flex-col items-center gap-1.5 text-muted-foreground p-3">
                            <span className="font-extrabold text-3xl font-display text-primary">Aa</span>
                            <span className="text-xs uppercase tracking-wider">.TTF File</span>
                          </div>
                        ) : (
                          <Link
                            href={productHref}
                            className="absolute inset-0"
                          >
                            <Image
                              src={imageSrc}
                              alt={`${productName} ${kitLabel}`}
                              fill
                              sizes="120px"
                              priority={index === 0}
                              className="object-contain p-2"
                              style={{ filter: kitImageFilters[item.kit] }}
                            />
                          </Link>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {isFont ? "Name & number style" : "Jersey"}
                        </p>
                        {isFont ? (
                          <span className="mt-1 block truncate text-base font-bold text-foreground">
                            {item.customName} Custom Font
                          </span>
                        ) : (
                          <Link href={productHref} className="mt-1 block truncate text-base font-bold hover:underline">
                            {productName}
                          </Link>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isFont ? "Digital Purchase" : `${kitLabel} / Size ${item.size}`}
                        </p>
                        {!isFont && (item.customName || item.customNumber) && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Print: {[item.customName, item.customNumber].filter(Boolean).join(" ")}
                            {item.customizationFee ? ` (+${formatPriceAED(item.customizationFee)})` : ""}
                          </p>
                        )}
                        {!isFont && item.fontSlug && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Font: {item.fontSlug}
                          </p>
                        )}
                        {!isFont && item.armBadge && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Badge: {item.armBadge.toUpperCase()}
                            {item.armBadgeFee ? ` (+${formatPriceAED(item.armBadgeFee)})` : ""}
                          </p>
                        )}
                        <p className="price-display mt-3 text-xl sm:hidden">{formatPriceAED((item.unitPrice + (item.customizationFee ?? 0) + (item.armBadgeFee ?? 0)) * item.quantity)}</p>

                        <div className="mt-4 flex items-center gap-3">
                          <div className="flex items-center rounded-full border border-border p-0.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              className="flex size-8 items-center justify-center rounded-full hover:bg-muted"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-8 text-center text-xs font-semibold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, Math.min(10, item.quantity + 1))}
                              disabled={item.quantity >= (item.maxQuantity ?? 10)}
                              className="flex size-8 items-center justify-center rounded-full hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label="Increase quantity"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Remove ${isFont ? item.customName : productName}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="hidden text-right sm:block">
                        <p className="price-display text-xl">{formatPriceAED((item.unitPrice + (item.customizationFee ?? 0) + (item.armBadgeFee ?? 0)) * item.quantity)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatPriceAED(item.unitPrice + (item.customizationFee ?? 0) + (item.armBadgeFee ?? 0))} each</p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <aside className="border-t border-border pt-6 lg:sticky lg:top-28 lg:rounded-xl lg:border lg:p-6">
                <h2 className="text-base font-bold">Order Summary</h2>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Subtotal</dt>
                    <dd className="text-foreground">{formatPriceAED(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Delivery</dt>
                    <dd>Confirmed after review</dd>
                  </div>
                </dl>
                <div className="mt-5 flex items-end justify-between border-t border-border pt-5">
                  <span className="text-sm font-semibold">Current subtotal</span>
                  <span className="price-display text-2xl">{formatPriceAED(subtotal)}</span>
                </div>
                <Link
                  href="/checkout"
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground hover:bg-primary/90"
                >
                  Continue to Checkout
                </Link>
                <Link href="/shop" className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                  <ArrowLeft size={13} /> Continue shopping
                </Link>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
