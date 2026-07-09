"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Copy, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import { formatPriceAED, kitOptions } from "@/lib/jerseys";
import {
  getPublicProductImage,
  getVariantAvailableSizes,
  getVariantAvailableStock,
  loadCatalogProducts,
  type CatalogProduct,
} from "@/lib/products";

type StockFilter = "all" | "available" | "low" | "out";

function getStockLabel(stock: number) {
  if (stock <= 0) return { label: "Out of stock", className: "border-red-200 bg-red-50 text-red-700" };
  if (stock <= 3) return { label: "Low stock", className: "border-amber-200 bg-amber-50 text-amber-700" };
  return { label: "Available", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

export default function Pricelists() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "all");
  const [stockFilter, setStockFilter] = useState<StockFilter>((searchParams.get("stock") as StockFilter) ?? "all");

  useEffect(() => {
    let mounted = true;
    loadCatalogProducts()
      .then((items) => {
        if (mounted) setProducts(items);
      })
      .catch(() => {
        if (mounted) setProducts([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "all") params.set("category", category);
    if (stockFilter !== "all") params.set("stock", stockFilter);
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [category, pathname, query, router, stockFilter]);

  const categories = useMemo(() => {
    return ["all", ...Array.from(new Set(products.map((product) => product.leagues?.name ?? product.category).filter(Boolean)))];
  }, [products]);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();

    return products.flatMap((product) => {
      return (product.product_variants ?? []).flatMap((variant) => {
        const stock = getVariantAvailableStock(variant);
        const categoryLabel = product.leagues?.name ?? product.category;
        const matchesSearch = !term || [
          product.name,
          product.team,
          product.teams?.name ?? "",
          product.collection ?? "",
          variant.name,
          variant.sku ?? "",
        ].some((value) => value.toLowerCase().includes(term));
        const matchesCategory = category === "all" || categoryLabel === category;
        const matchesStock =
          stockFilter === "all"
          || (stockFilter === "available" && stock > 3)
          || (stockFilter === "low" && stock > 0 && stock <= 3)
          || (stockFilter === "out" && stock <= 0);

        if (!variant.available && stockFilter !== "out") return [];
        if (!matchesSearch || !matchesCategory || !matchesStock) return [];

        return [{
          product,
          variant,
          categoryLabel,
          stock,
          sizes: getVariantAvailableSizes(variant),
        }];
      });
    });
  }, [category, products, query, stockFilter]);

  const handleCopyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 px-5 pb-14 pt-28 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="border-b border-border pb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">TISA public prices</p>
            <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pricelists</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Share current jersey pricing, available kits, sizes, and stock status.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border px-5 text-[10px] font-bold uppercase tracking-[0.14em] hover:border-primary/50"
              >
                <Copy size={13} /> {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>

          <section className="mt-5 grid gap-3 rounded-xl border border-border bg-background p-3 lg:grid-cols-[minmax(0,1fr)_200px_170px]">
            <label className="relative block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search product, team, SKU..."
                className="h-11 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="relative block">
              <SlidersHorizontal size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 w-full rounded-full border border-border bg-background pl-9 pr-4 text-xs font-semibold uppercase tracking-[0.1em] outline-none focus:border-primary"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>{item === "all" ? "All categories" : item}</option>
                ))}
              </select>
            </label>
            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value as StockFilter)}
              className="h-11 rounded-full border border-border bg-background px-4 text-xs font-semibold uppercase tracking-[0.1em] outline-none focus:border-primary"
            >
              <option value="all">All stock</option>
              <option value="available">Available</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </section>

          {loading ? (
            <div className="mt-8 rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
              Loading pricelist...
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No matching prices found.
            </div>
          ) : (
            <section className="mt-6 overflow-hidden rounded-xl border border-border bg-background">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Kit</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Sizes</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map(({ product, variant, categoryLabel, stock, sizes }) => {
                      const stockLabel = getStockLabel(stock);
                      const kitLabel = kitOptions.find((kit) => kit.id === variant.kit)?.label ?? variant.name;
                      return (
                        <tr key={variant.id} className="hover:bg-muted/20">
                          <td className="px-4 py-4">
                            <Link href={`/jersey/${product.slug}`} className="flex items-center gap-3 hover:text-primary">
                              <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                                <Image src={getPublicProductImage(variant.image_front_path)} alt={product.name} fill sizes="48px" className="object-contain p-1" />
                              </span>
                              <span className="min-w-0">
                                <strong className="block truncate text-sm">{product.name}</strong>
                                <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{categoryLabel}</span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-sm font-medium">{kitLabel}</td>
                          <td className="px-4 py-4 text-xs text-muted-foreground">{variant.sku ?? "-"}</td>
                          <td className="px-4 py-4 text-xs text-muted-foreground">{sizes.length ? sizes.join(" / ") : "-"}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${stockLabel.className}`}>
                              {stockLabel.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-bold">{formatPriceAED(variant.price)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
