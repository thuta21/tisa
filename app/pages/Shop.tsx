"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  PackageSearch,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import { formatPriceAED, kitOptions } from "@/lib/jerseys";
import { loadCatalogJerseys, type CatalogJersey } from "@/lib/products";

type SortOption = "newest" | "price-asc" | "price-desc";
type PriceFilter = "all" | "under-75" | "75-100" | "over-100";

const priceOptions: { value: PriceFilter; label: string }[] = [
  { value: "all", label: "All prices" },
  { value: "under-75", label: "Under AED 75" },
  { value: "75-100", label: "AED 75 – 100" },
  { value: "over-100", label: "Over AED 100" },
];

const sizeOrder = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

function getAvailableKits(jersey: CatalogJersey) {
  return kitOptions.filter((kit) => jersey.kits[kit.id].available);
}

function getStartingPrice(jersey: CatalogJersey) {
  const prices = getAvailableKits(jersey).map(
    (kit) => jersey.kits[kit.id].price ?? jersey.price,
  );
  return prices.length > 0 ? Math.min(...prices) : jersey.price;
}

function getPriceLabel(jersey: CatalogJersey) {
  const prices = getAvailableKits(jersey).map(
    (kit) => jersey.kits[kit.id].price ?? jersey.price,
  );
  const startingPrice = getStartingPrice(jersey);
  if (startingPrice <= 0) return "Price pending";
  return prices.some((price) => price !== startingPrice)
    ? `From ${formatPriceAED(startingPrice)}`
    : formatPriceAED(startingPrice);
}

function getAvailabilityLabel(jersey: CatalogJersey) {
  const kits = getAvailableKits(jersey);
  if (kits.length === 0) return "Sold out";
  if (kits.length === 1) return `Only ${kits[0].label.replace(" Kit", "")} available`;
  return `${kits.map((kit) => kit.label.replace(" Kit", "")).join(" & ")} available`;
}

function CatalogImage({ jersey }: { jersey: CatalogJersey }) {
  const [src, setSrc] = useState(jersey.image_front);

  return (
    <Image
      src={src}
      alt={jersey.name}
      fill
      sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
      className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.035]"
      style={{ filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.2))" }}
      onError={() => setSrc("/assets/tisa-shirt.png")}
    />
  );
}

function getInitialSort(): SortOption {
  if (typeof window === "undefined") return "newest";
  const requestedSort = new URLSearchParams(window.location.search).get("sort");
  return requestedSort === "price-asc" ||
    requestedSort === "price-desc" ||
    requestedSort === "newest"
    ? requestedSort
    : "newest";
}

function FilterGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-black/[0.08] py-5 last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold">
        {title}
        <ChevronDown
          size={17}
          className="text-muted-foreground transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="group/check flex min-h-8 cursor-pointer items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onChange}
        className={`grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-all ${
          checked
            ? "border-[#E10714] bg-[#E10714] text-white"
            : "border-black/20 bg-white group-hover/check:border-[#E10714]/60"
        }`}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </button>
      <span>{label}</span>
    </label>
  );
}

export default function Shop() {
  const [jerseys, setJerseys] = useState<CatalogJersey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>(getInitialSort);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
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

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileFiltersOpen]);

  const leagues = useMemo(
    () =>
      [...new Set(jerseys.map((jersey) => jersey.league).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [jerseys],
  );

  const teams = useMemo(
    () =>
      [...new Set(jerseys.map((jersey) => jersey.team).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [jerseys],
  );

  const sizes = useMemo(
    () =>
      [...new Set(jerseys.flatMap((jersey) => jersey.sizes).filter(Boolean))].sort(
        (a, b) => {
          const aIndex = sizeOrder.indexOf(a);
          const bIndex = sizeOrder.indexOf(b);
          if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        },
      ),
    [jerseys],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const items = jerseys.filter((jersey) => {
      const price = getStartingPrice(jersey);
      const matchSearch =
        !query ||
        jersey.name.toLowerCase().includes(query) ||
        jersey.team.toLowerCase().includes(query) ||
        jersey.league.toLowerCase().includes(query) ||
        jersey.season.toLowerCase().includes(query);
      const matchStock = !inStockOnly || getAvailableKits(jersey).length > 0;
      const matchLeague =
        selectedLeagues.length === 0 || selectedLeagues.includes(jersey.league);
      const matchTeam =
        selectedTeams.length === 0 || selectedTeams.includes(jersey.team);
      const matchSize =
        selectedSizes.length === 0 ||
        selectedSizes.some((size) => jersey.sizes.includes(size));
      const matchPrice =
        priceFilter === "all" ||
        (priceFilter === "under-75" && price < 75) ||
        (priceFilter === "75-100" && price >= 75 && price <= 100) ||
        (priceFilter === "over-100" && price > 100);

      return (
        matchSearch &&
        matchStock &&
        matchLeague &&
        matchTeam &&
        matchSize &&
        matchPrice
      );
    });

    return [...items].sort((a, b) => {
      const aPrice =
        getStartingPrice(a) > 0
          ? getStartingPrice(a)
          : Number.POSITIVE_INFINITY;
      const bPrice =
        getStartingPrice(b) > 0
          ? getStartingPrice(b)
          : Number.POSITIVE_INFINITY;
      if (sort === "price-asc") return aPrice - bPrice;
      if (sort === "price-desc") {
        return (
          (Number.isFinite(bPrice) ? bPrice : -1) -
          (Number.isFinite(aPrice) ? aPrice : -1)
        );
      }
      return (
        new Date(b.product.created_at ?? 0).getTime() -
        new Date(a.product.created_at ?? 0).getTime()
      );
    });
  }, [
    inStockOnly,
    jerseys,
    priceFilter,
    search,
    selectedLeagues,
    selectedSizes,
    selectedTeams,
    sort,
  ]);

  const activeFilterCount =
    selectedLeagues.length +
    selectedTeams.length +
    selectedSizes.length +
    (priceFilter === "all" ? 0 : 1) +
    (inStockOnly ? 1 : 0);

  const toggleValue = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const resetFilters = () => {
    setSearch("");
    setSort("newest");
    setInStockOnly(false);
    setSelectedLeagues([]);
    setSelectedTeams([]);
    setSelectedSizes([]);
    setPriceFilter("all");
  };

  const filterPanel = (
    <div>
      <div className="flex items-center justify-between border-b border-black/[0.08] pb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={17} />
          <h2 className="text-sm font-black uppercase tracking-[0.12em]">Filters</h2>
          {activeFilterCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-[#E10714] text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-semibold text-[#E10714] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <FilterGroup title="Availability">
        <FilterCheckbox
          label="In stock only"
          checked={inStockOnly}
          onChange={() => setInStockOnly((current) => !current)}
        />
      </FilterGroup>

      <FilterGroup title="League">
        <div className="space-y-2">
          {leagues.map((league) => (
            <FilterCheckbox
              key={league}
              label={league}
              checked={selectedLeagues.includes(league)}
              onChange={() => toggleValue(league, setSelectedLeagues)}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Team" defaultOpen={false}>
        <div className="max-h-56 space-y-2 overflow-y-auto pr-2">
          {teams.map((team) => (
            <FilterCheckbox
              key={team}
              label={team}
              checked={selectedTeams.includes(team)}
              onChange={() => toggleValue(team, setSelectedTeams)}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Size">
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => {
            const selected = selectedSizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleValue(size, setSelectedSizes)}
                className={`min-w-10 rounded-lg border px-2.5 py-2 text-xs font-bold transition-all ${
                  selected
                    ? "border-[#E10714] bg-[#E10714] text-white"
                    : "border-black/10 bg-white hover:border-[#E10714]/50 hover:text-[#E10714]"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Price">
        <div className="space-y-2">
          {priceOptions.map((option) => (
            <label
              key={option.value}
              className="flex min-h-8 cursor-pointer items-center gap-3 text-sm text-muted-foreground hover:text-foreground"
            >
              <input
                type="radio"
                name="price"
                value={option.value}
                checked={priceFilter === option.value}
                onChange={() => setPriceFilter(option.value)}
                className="size-4 accent-[#E10714]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <div className="tisa-page-surface flex min-h-screen flex-col text-foreground">
      <Navbar />
      <main className="relative isolate flex-1 overflow-hidden pb-16 pt-24 sm:pt-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-24 -z-10 size-[30rem] rounded-full bg-[#ff001c]/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-44 top-[46rem] -z-10 size-[28rem] rounded-full bg-black/[0.055] blur-3xl"
        />
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6">
          <div className="mb-7 border-b border-black/[0.08] pb-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E10714]">
              Shop jerseys
            </p>
            <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <h1 className="text-4xl font-normal tracking-[-0.045em] sm:text-5xl">
                  All jerseys
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Find your team, choose your fit and compare every available kit.
                </p>
              </div>
              <p className="text-sm font-semibold text-muted-foreground">
                <span className="text-foreground">{filtered.length}</span>{" "}
                {filtered.length === 1 ? "product" : "products"}
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
            <aside
              aria-label="Product filters"
              className="sticky top-24 hidden self-start rounded-2xl border border-white/90 bg-white/80 p-5 shadow-[0_16px_45px_rgba(0,0,0,0.07)] backdrop-blur-xl lg:block"
            >
              {filterPanel}
            </aside>

            <section aria-label="Jersey collection" className="min-w-0">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Search jerseys</span>
                  <Search
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search team or jersey..."
                    className="h-11 w-full rounded-xl border border-black/10 bg-white pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-[#E10714]"
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(true)}
                    className="relative inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold lg:hidden"
                  >
                    <SlidersHorizontal size={16} />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="grid size-5 place-items-center rounded-full bg-[#E10714] text-[10px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  <label className="relative min-w-[176px] flex-1 sm:flex-none">
                    <span className="sr-only">Sort jerseys</span>
                    <ArrowUpDown
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value as SortOption)}
                      className="h-11 w-full appearance-none rounded-xl border border-black/10 bg-white pl-9 pr-8 text-sm font-semibold outline-none focus:border-[#E10714]"
                    >
                      <option value="newest">Newest</option>
                      <option value="price-asc">Price: low to high</option>
                      <option value="price-desc">Price: high to low</option>
                    </select>
                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                  </label>
                </div>
              </div>

              {loading ? (
                <div
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  aria-label="Loading jerseys"
                >
                  {[0, 1, 2, 3, 4, 5].map((item) => (
                    <div
                      key={item}
                      className="aspect-[3/4] animate-pulse rounded-2xl bg-black/[0.05]"
                    />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-white/40 px-5 text-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-white text-muted-foreground shadow-sm">
                    <PackageSearch size={22} />
                  </span>
                  <h2 className="mt-4 text-xl font-bold">
                    No jerseys match those filters.
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Clear the filters to see the full collection.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-5 h-11 rounded-full bg-[#E10714] px-5 text-sm font-semibold text-white"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((jersey) => {
                    const inStock = getAvailableKits(jersey).length > 0;
                    return (
                      <article key={jersey.id}>
                        <Link
                          href={`/jersey/${jersey.slug}`}
                          className="group block h-full overflow-hidden rounded-2xl border border-white/90 bg-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.055)] transition-all duration-300 hover:-translate-y-1 hover:border-[#E10714]/45 hover:shadow-[0_20px_45px_rgba(225,7,20,0.1)]"
                        >
                          <div className="tisa-card-highlight relative aspect-[4/4.45] overflow-hidden">
                            <CatalogImage
                              key={jersey.image_front}
                              jersey={jersey}
                            />
                            <span
                              className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] backdrop-blur ${
                                inStock
                                  ? "bg-white/85 text-emerald-700"
                                  : "bg-black/70 text-white"
                              }`}
                            >
                              {inStock ? "In stock" : "Sold out"}
                            </span>
                          </div>
                          <div className="border-t border-black/[0.07] p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#E10714]">
                              {jersey.league}
                            </p>
                            <h2 className="mt-1 line-clamp-2 text-base font-bold leading-snug tracking-tight transition-colors group-hover:text-[#E10714]">
                              {jersey.name}
                            </h2>
                            <p className="mt-2 truncate text-xs text-muted-foreground">
                              {getAvailabilityLabel(jersey)}
                            </p>
                            <div className="mt-4 flex items-end justify-between gap-3">
                              <span className="truncate text-sm text-muted-foreground">
                                {jersey.team}
                              </span>
                              <span className="price-display shrink-0 text-lg">
                                {getPriceLabel(jersey)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-black/35 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,360px)] overflow-y-auto bg-[#f8f7f4] p-5 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-lg font-black tracking-tight">Filter products</p>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setMobileFiltersOpen(false)}
                className="grid size-10 place-items-center rounded-full border border-black/10 bg-white"
              >
                <X size={18} />
              </button>
            </div>
            {filterPanel}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="sticky bottom-0 mt-5 h-12 w-full rounded-xl bg-[#E10714] text-sm font-bold text-white shadow-[0_12px_28px_rgba(225,7,20,0.25)]"
            >
              Show {filtered.length} {filtered.length === 1 ? "product" : "products"}
            </button>
          </aside>
        </div>
      )}

      <Footer />
    </div>
  );
}
