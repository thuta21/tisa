"use client";

import { useDeferredValue, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PackageSearch, Search, X } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import ProductCard from "@/components/jersey/ProductCard";
import type { CatalogJersey } from "@/lib/products";
import { filterCatalog, readCatalogFilters, type CatalogFilters } from "@/lib/catalog-filters";
import { sleeveOptions } from "@/lib/product-sleeves";
import { kitOptions } from "@/lib/jerseys";

const selectClass = "h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-primary";
export default function Shop({ jerseys }: { jerseys: CatalogJersey[] }) {
  const params = useSearchParams();
  const filters = readCatalogFilters(params);
  const query = useDeferredValue(params.toString());
  const filtered = useMemo(() => filterCatalog(jerseys, readCatalogFilters(new URLSearchParams(query))), [jerseys, query]);
  const options = (field: "league" | "team" | "season") => [...new Set(jerseys.filter(item => field !== "team" || !filters.league || item.league === filters.league).map(item => item[field]).filter(Boolean))].sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
  const update = (key: keyof CatalogFilters, value: string) => {
    const next = new URLSearchParams(window.location.search);
    if (value && !(key === "sort" && value === "featured")) next.set(key, value); else next.delete(key);
    if (key === "league") next.delete("team");
    window.history.replaceState(null, "", `/shop${next.size ? `?${next}` : ""}`);
  };
  const activeFilters = Object.entries(filters).filter(([key, value]) => key !== "sort" && value);
  const clear = () => {
    const next = new URLSearchParams(window.location.search);
    for (const key of ["q", "league", "team", "season", "sleeve", "kit"]) next.delete(key);
    window.history.replaceState(null, "", `/shop${next.size ? `?${next}` : ""}`);
  };
  return <div className="tisa-page-surface flex min-h-screen flex-col text-foreground">
    <Navbar />
    <main id="main-content" tabIndex={-1} className="flex-1 pb-12 pt-24 sm:pb-24 sm:pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">TISA collection</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Find your team.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 sm:mt-4 sm:text-base sm:leading-7 text-muted-foreground">Explore teams, kit designs and sleeve styles. Online ordering is not open yet.</p>
        <div className="mt-6 grid grid-cols-2 items-end gap-3 sm:mt-8 sm:gap-4 rounded-2xl border border-border bg-white/75 p-4 sm:grid-cols-2 sm:p-5">
          <label className="grid gap-2 text-sm font-medium col-span-2">Search collection<span className="relative"><Search size={18} aria-hidden="true" className="absolute left-3 top-3.5 text-muted-foreground" /><input type="search" value={filters.q} onChange={e => update("q", e.target.value)} placeholder="Team, season or kit" className={`${selectClass} pl-10 pr-3`} /></span></label>
          {(["league", "team"] as const).map(field => <label key={field} className="grid gap-2 text-sm font-medium"><span className="min-w-0 truncate capitalize">{field}</span><select value={filters[field]} onChange={e => update(field, e.target.value)} className={selectClass}><option value="">All {field === "league" ? "leagues" : "teams"}</option>{filters[field] && !options(field).includes(filters[field]) && <option value={filters[field]}>{filters[field]}</option>}{options(field).map(value => <option key={value}>{value}</option>)}</select></label>)}
          <details className="border-t border-border pt-4 col-span-2">
            <summary className="min-h-11 cursor-pointer text-sm font-medium text-primary">Style filters &amp; sorting</summary>
            <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-2 text-sm font-medium">Season<select className={selectClass} value={filters.season} onChange={e => update("season", e.target.value)}><option value="">All seasons</option>{filters.season && !options("season").includes(filters.season) && <option>{filters.season}</option>}{options("season").map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-medium">Sleeve<select className={selectClass} value={filters.sleeve} onChange={e => update("sleeve", e.target.value)}><option value="">All sleeves</option>{sleeveOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-medium">Kit design<select className={selectClass} value={filters.kit} onChange={e => update("kit", e.target.value)}><option value="">All kit designs</option>{kitOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-medium">Sort by<select className={selectClass} value={filters.sort} onChange={e => update("sort", e.target.value)}><option value="featured">Featured &amp; newest</option><option value="name">Name: A–Z</option><option value="season">Latest season</option></select></label>
            </div>
          </details>
        </div>
        {activeFilters.length > 0 && <div className="mt-4 flex flex-wrap gap-2" aria-label="Active filters">{activeFilters.map(([key, value]) => <button key={key} type="button" aria-label={`Remove ${key === "q" ? "search" : key} filter: ${value}`} onClick={() => update(key as keyof CatalogFilters, "")} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 text-sm text-primary"><span className="min-w-0 truncate capitalize">{key === "q" ? "Search" : key}: {value}</span><X className="shrink-0" aria-hidden="true" size={14} /></button>)}</div>}
        <div className="my-6 flex min-h-10 items-center justify-between gap-4"><p role="status" aria-live="polite" className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "jersey" : "jerseys"}</p>{activeFilters.length > 0 && <button type="button" onClick={clear} className="min-h-11 px-2 text-sm font-medium text-primary">Clear filters</button>}</div>
        <div aria-busy={query !== params.toString()}>
          {filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-border px-5 py-16 text-center"><PackageSearch size={32} aria-hidden="true" className="mx-auto text-muted-foreground" /><h2 className="mt-4 text-xl font-semibold">{activeFilters.length ? "No matching jerseys." : "The collection is being prepared."}</h2><p className="mt-2 text-sm text-muted-foreground">{activeFilters.length ? "Try another style or clear your filters to explore the collection." : "Check back for a first look at our jerseys."}</p>{activeFilters.length > 0 && <button type="button" onClick={clear} className="mt-5 min-h-12 rounded-full bg-primary px-6 text-sm font-semibold text-white">Clear filters</button>}</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(jersey => <ProductCard key={jersey.productId} jersey={jersey} kit={filters.kit} />)}</div>}
        </div>
      </div>
    </main>
    <Footer />
  </div>;
}
