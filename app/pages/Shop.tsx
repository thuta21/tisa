"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpDown, PackageSearch, Search } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import { formatPriceAED, kitOptions } from "@/lib/jerseys";
import { loadCatalogJerseys, type CatalogJersey } from "@/lib/products";

type SortOption = "newest" | "price-asc" | "price-desc";

function getAvailableKits(jersey: CatalogJersey) {
  return kitOptions.filter((kit) => jersey.kits[kit.id].available);
}

function getStartingPrice(jersey: CatalogJersey) {
  const prices = getAvailableKits(jersey).map((kit) => jersey.kits[kit.id].price ?? jersey.price);
  return prices.length > 0 ? Math.min(...prices) : jersey.price;
}

function getPriceLabel(jersey: CatalogJersey) {
  const prices = getAvailableKits(jersey).map((kit) => jersey.kits[kit.id].price ?? jersey.price);
  const startingPrice = getStartingPrice(jersey);
  if (startingPrice <= 0) return "Price pending";
  return prices.some((price) => price !== startingPrice) ? `From ${formatPriceAED(startingPrice)}` : formatPriceAED(startingPrice);
}

function getAvailabilityLabel(jersey: CatalogJersey) {
  const kits = getAvailableKits(jersey);
  if (kits.length === 0) return "Sold out";
  if (kits.length === 1) return `Only ${kits[0].label.replace(" Kit", "")} available`;
  return `${kits.map((kit) => kit.label.replace(" Kit", "")).join(" & ")} available`;
}

function CatalogImage({ jersey }: { jersey: CatalogJersey }) {
  const [src, setSrc] = useState(jersey.image_front);
  useEffect(() => setSrc(jersey.image_front), [jersey.image_front]);
  return <Image src={src} alt={jersey.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.035]" style={{ filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.24))" }} onError={() => setSrc("/assets/tisa-shirt.png")} />;
}

export default function Shop() {
  const [jerseys, setJerseys] = useState<CatalogJersey[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    const requestedSort = new URLSearchParams(window.location.search).get("sort");
    if (requestedSort === "price-asc" || requestedSort === "price-desc" || requestedSort === "newest") setSort(requestedSort);

    let mounted = true;
    loadCatalogJerseys()
      .then((items) => {
        if (mounted) setJerseys(items);
      })
      .catch(() => {
        if (mounted) setJerseys([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => ["All", ...new Set(jerseys.map((jersey) => jersey.category).filter(Boolean))], [jerseys]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const items = jerseys.filter((jersey) => {
      const matchCategory = filter === "All" || jersey.category === filter;
      const matchSearch = !query || jersey.name.toLowerCase().includes(query) || jersey.team.toLowerCase().includes(query);
      const matchStock = !inStockOnly || getAvailableKits(jersey).length > 0;
      return matchCategory && matchSearch && matchStock;
    });

    return [...items].sort((a, b) => {
      const aPrice = getStartingPrice(a) > 0 ? getStartingPrice(a) : Number.POSITIVE_INFINITY;
      const bPrice = getStartingPrice(b) > 0 ? getStartingPrice(b) : Number.POSITIVE_INFINITY;
      if (sort === "price-asc") return aPrice - bPrice;
      if (sort === "price-desc") return (Number.isFinite(bPrice) ? bPrice : -1) - (Number.isFinite(aPrice) ? aPrice : -1);
      return new Date(b.product.created_at ?? 0).getTime() - new Date(a.product.created_at ?? 0).getTime();
    });
  }, [filter, inStockOnly, jerseys, search, sort]);

  const resetFilters = () => {
    setFilter("All");
    setSearch("");
    setSort("newest");
    setInStockOnly(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 pb-14 pt-24 sm:pt-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="mb-8 sm:mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Shop jerseys</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">All jerseys</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">Compare available kits, prices and stock before opening a product.</p>
          </div>

          <section aria-label="Shop filters" className="mb-8 rounded-2xl border border-border bg-card/50 p-3 sm:mb-10 sm:p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_auto]">
              <label className="relative">
                <span className="sr-only">Search jerseys</span>
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search team or jersey..." className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary" />
              </label>

              <label className="relative">
                <span className="sr-only">Sort jerseys</span>
                <ArrowUpDown size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} className="h-11 w-full appearance-none rounded-xl border border-border bg-background pl-10 pr-9 text-sm font-medium outline-none focus:border-primary">
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </label>

              <button type="button" aria-pressed={inStockOnly} onClick={() => setInStockOnly((current) => !current)} className={`h-11 rounded-xl border px-4 text-sm font-medium transition-colors ${inStockOnly ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>In stock only</button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              {categories.map((category) => (
                <button key={category} type="button" aria-pressed={filter === category} onClick={() => setFilter(category)} className={`min-h-10 rounded-lg border px-4 text-sm font-medium transition-colors ${filter === category ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>{category}</button>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "jersey" : "jerseys"} found</p>
          </section>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6" aria-label="Loading jerseys">
              {[0, 1, 2].map((item) => <div key={item} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-border px-5 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground"><PackageSearch size={22} /></span>
              <h2 className="mt-4 text-xl font-bold">No jerseys match those filters.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Clear the filters to see the full collection.</p>
              <button type="button" onClick={resetFilters} className="mt-5 h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Reset filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {filtered.map((jersey) => {
                const inStock = getAvailableKits(jersey).length > 0;
                return (
                  <article key={jersey.id}>
                    <Link href={`/jersey/${jersey.slug}`} className="group block overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/35">
                      <div className="relative aspect-[4/5] overflow-hidden bg-muted/45 p-5 sm:p-6">
                        <CatalogImage jersey={jersey} />
                      </div>
                      <div className="border-t border-border p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><p className="text-sm font-medium text-primary">{jersey.category}</p><h2 className="mt-1 text-lg font-semibold leading-snug transition-colors group-hover:text-primary">{jersey.name}</h2></div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${inStock ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{inStock ? "In stock" : "Sold out"}</span>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{getAvailabilityLabel(jersey)}</p>
                        <div className="mt-4 flex items-end justify-between gap-3"><span className="text-base text-muted-foreground">{jersey.team}</span><span className="price-display text-2xl">{getPriceLabel(jersey)}</span></div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
