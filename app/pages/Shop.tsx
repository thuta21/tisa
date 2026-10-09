"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, PackageSearch, Search } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import { loadCatalogJerseys, type CatalogJersey } from "@/lib/products";

function CatalogImage({ jersey }: { jersey: CatalogJersey }) {
  const [src, setSrc] = useState(jersey.image_front);
  return <Image src={src} alt={jersey.name} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" className="object-contain p-6 transition-transform duration-300 group-hover:scale-[1.035]" onError={() => setSrc("/assets/jersey-placeholder.svg")} />;
}

export default function Shop() {
  const [jerseys, setJerseys] = useState<CatalogJersey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [league, setLeague] = useState("");
  const [team, setTeam] = useState("");

  useEffect(() => {
    let mounted = true;
    loadCatalogJerseys().then((items) => {
      if (mounted) setJerseys(items);
    }).catch(() => {
      if (mounted) setError(true);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [attempt]);

  const leagues = useMemo(() => [...new Set(jerseys.map((item) => item.league).filter(Boolean))].sort(), [jerseys]);
  const teams = useMemo(() => [...new Set(jerseys.filter((item) => !league || item.league === league).map((item) => item.team).filter(Boolean))].sort(), [jerseys, league]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jerseys.filter((item) => (!league || item.league === league) && (!team || item.team === team) && (!query || [item.name, item.team, item.league, item.season].some((value) => value.toLowerCase().includes(query))));
  }, [jerseys, league, team, search]);
  const hasFilters = Boolean(search || league || team);

  return (
    <div className="tisa-page-surface flex min-h-screen flex-col text-foreground">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 pb-16 pt-28 sm:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">TISA collection</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Find your team.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Explore jersey designs and kit details. This is a collection preview; online ordering is not open yet.</p>
          <div className="mt-8 grid items-end gap-4 rounded-2xl border border-border bg-white/75 p-4 sm:grid-cols-[minmax(0,2fr)_1fr_1fr] sm:p-5">
            <label className="grid gap-2 text-sm font-medium">Search collection<span className="relative"><Search size={18} className="absolute left-3 top-3.5 text-muted-foreground" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a team or jersey" className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-base outline-none focus:border-primary" /></span></label>
            <label className="grid gap-2 text-sm font-medium">League<select value={league} onChange={(event) => { setLeague(event.target.value); setTeam(""); }} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base"><option value="">All leagues</option>{leagues.map((name) => <option key={name}>{name}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-medium">Team<select value={team} onChange={(event) => setTeam(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base"><option value="">All teams</option>{teams.map((name) => <option key={name}>{name}</option>)}</select></label>
          </div>
          {!loading && !error && <div className="my-6 flex min-h-10 items-center justify-between gap-4"><p role="status" className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "jersey" : "jerseys"}</p>{hasFilters && <button type="button" onClick={() => { setSearch(""); setLeague(""); setTeam(""); }} className="min-h-10 px-2 text-sm font-medium text-primary">Clear filters</button>}</div>}
          {loading ? <div role="status" className="grid gap-5 pt-7 sm:grid-cols-2 lg:grid-cols-3"><span className="sr-only">Loading the collection</span>{[0, 1, 2].map((key) => <div key={key} className="aspect-[4/5] animate-pulse rounded-2xl bg-black/5 motion-reduce:animate-none" />)}</div> : error ? <div role="alert" className="my-10 rounded-2xl border border-border bg-white p-8 text-center"><h2 className="text-xl font-semibold">The collection could not be loaded.</h2><p className="mt-3 text-muted-foreground">Please try again in a moment.</p><button type="button" onClick={() => { setError(false); setLoading(true); setAttempt((value) => value + 1); }} className="mt-5 min-h-11 rounded-full bg-primary px-6 text-sm font-semibold text-white">Try again</button></div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-border py-16 text-center"><PackageSearch size={32} className="mx-auto text-muted-foreground" /><h2 className="mt-4 text-xl font-semibold">{hasFilters ? "No matching jerseys." : "The collection is being prepared."}</h2><p className="mt-2 text-sm text-muted-foreground">{hasFilters ? "Try a different team or clear your filters." : "Check back for a first look at our jerseys."}</p></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((jersey) => <Link key={jersey.productId} href={`/jersey/${jersey.slug}`} className="group overflow-hidden rounded-[24px] border border-border bg-white/85 transition-shadow hover:shadow-lg"><div className="relative aspect-[4/3] bg-[#eeece7]"><CatalogImage jersey={jersey} /></div><div className="p-5"><p className="text-xs text-muted-foreground">{jersey.league}{jersey.season ? ` · ${jersey.season}` : ""}</p><h2 className="mt-2 text-xl font-semibold tracking-tight">{jersey.name}</h2><span className="mt-4 flex items-center justify-between text-sm font-medium text-primary">View jersey details <ArrowUpRight size={18} /></span></div></Link>)}</div>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
