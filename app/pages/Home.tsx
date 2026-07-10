"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, ClipboardCheck, Ruler } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import Carousel3D from "@/components/jersey/Carousel3D";
import { loadCatalogJerseys, type CatalogJersey } from "@/lib/products";

export default function Home() {
  const router = useRouter();
  const [jerseys, setJerseys] = useState<CatalogJersey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    loadCatalogJerseys()
      .then((items) => {
        if (mounted) setJerseys(items.filter((item) => item.featured));
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden pb-5 pt-20 md:min-h-screen md:pb-7">
        {jerseys.length > 0 ? (
          <Carousel3D
            jerseys={jerseys}
            onSelect={(jersey) => router.push(`/jersey/${(jersey as CatalogJersey).slug ?? jersey.id}`)}
          />
        ) : (
          <div className="text-center py-24">
            <p className="text-muted-foreground font-mono text-sm">No jerseys available yet.</p>
          </div>
        )}
      </main>

      <section className="border-t border-border py-10 sm:py-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-5 sm:px-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Current collection</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Find the kit that feels like yours.</h2>
            <p className="mt-2 text-base text-muted-foreground">Compare every available team, kit version and size in the shop.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link href="/shop?sort=newest" className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold transition-colors hover:bg-muted">View new arrivals</Link>
            <Link href="/shop" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Shop all jerseys <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-0 px-5 sm:px-6 md:grid-cols-3">
          {[
            { icon: BadgeCheck, title: "Choose your kit", text: "See which Home, Away and Third versions are currently available." },
            { icon: Ruler, title: "Confirm your fit", text: "Measure a shirt you own and check the available sizes before ordering." },
            { icon: ClipboardCheck, title: "Review your order", text: "Delivery and payment details are confirmed during order review." },
          ].map((item) => (
            <div key={item.title} className="flex gap-4 border-b border-border py-5 last:border-b-0 md:border-b-0 md:border-r md:px-7 md:py-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><item.icon size={18} /></div>
              <div>
                <h2 className="text-base font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
