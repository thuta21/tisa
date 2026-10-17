import type { Metadata } from "next";
import Link from "next/link";
import { Ruler } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import ResponsiveSizeChart from "@/components/jersey/ResponsiveSizeChart";

export const metadata: Metadata = { title: "Fit Guide | TISA", description: "Player Version jersey measurements and fit guidance." };

export default function CustomerCarePage() {
  return <div className="tisa-page-surface flex min-h-screen flex-col text-foreground"><Navbar /><main id="main-content" tabIndex={-1} className="flex-1 pb-16 pt-28"><article id="size-guide" className="mx-auto max-w-4xl scroll-mt-28 px-5 sm:px-6"><Ruler size={28} className="text-primary" /><h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Find your fit.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">Measure a shirt you already own and compare it with the Player Version size chart. Measurements are a guide and may vary by 1–3 cm.</p><div className="mt-7"><ResponsiveSizeChart /></div><div className="mt-7 rounded-2xl border border-border bg-white/70 p-6"><h2 className="text-lg font-semibold">How to measure</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">Lay your shirt flat. Measure the length from the highest shoulder point to the hem, and the chest width from underarm to underarm. Height and weight ranges are suggestions; use your shirt measurements to compare fit.</p></div><Link href="/shop" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white">Explore the collection</Link></article></main><Footer /></div>;
}
