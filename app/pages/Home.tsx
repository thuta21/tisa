"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, Eye, Ruler } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import FeaturedJerseyShowcase from "@/components/jersey/FeaturedJerseyShowcase";
import {
  loadCatalogJerseys,
  loadCatalogLeagues,
  loadCatalogTeams,
  type CatalogLeague,
  type CatalogJersey,
  type CatalogTeam,
} from "@/lib/products";

export default function Home() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [jerseys, setJerseys] = useState<CatalogJersey[]>([]);
  const [catalogTeams, setCatalogTeams] = useState<CatalogTeam[]>([]);
  const [catalogLeagues, setCatalogLeagues] = useState<CatalogLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadCatalogJerseys(), loadCatalogTeams(), loadCatalogLeagues()])
      .then(([items, teams, leagues]) => {
        if (!mounted) return;

        setCatalogTeams(teams);
        setCatalogLeagues(leagues);

        setJerseys(items);
      })
      .catch(() => {
        if (mounted) setError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [attempt]);

  if (loading) {
    return <div className="tisa-page-surface flex min-h-screen flex-col"><Navbar /><main id="main-content" tabIndex={-1} role="status" className="grid flex-1 place-items-center pt-24"><div className="size-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary motion-reduce:animate-none" /><span className="sr-only">Loading the collection</span></main><Footer /></div>;
  }

  return (
    <div className="tisa-page-surface min-h-screen text-foreground flex flex-col">
      <Navbar />

      <main id="main-content" tabIndex={-1} className="tisa-page-surface">
        {error ? (
          <section role="alert" className="mx-auto max-w-2xl px-5 pb-16 pt-36 text-center"><h1 className="text-3xl font-semibold">The collection could not be loaded.</h1><p className="mt-4 text-muted-foreground">Please try again in a moment.</p><button type="button" onClick={() => { setError(false); setLoading(true); setAttempt((value) => value + 1); }} className="mt-6 min-h-12 rounded-full bg-primary px-6 text-sm font-semibold text-white">Try again</button></section>
        ) : jerseys.length > 0 ? (
          <FeaturedJerseyShowcase
            jerseys={jerseys}
            catalogTeams={catalogTeams}
            catalogLeagues={catalogLeagues}
            onSelect={(jersey) => {
              router.push(`/jersey/${jersey.slug}`);
            }}
          />
        ) : (
          <div className="text-center pb-20 pt-36">
            <h1 className="text-3xl font-semibold">The collection is being prepared.</h1>
            <p className="mt-4 text-muted-foreground">Check back for a first look at TISA.</p>
          </div>
        )}

        <div
          className="relative isolate overflow-hidden rounded-t-[20px] bg-[#101010] text-white sm:rounded-t-[28px]"
          style={{
            background:
              "linear-gradient(115deg, #101010 0%, #101010 56%, #351012 100%)",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 -top-48 -z-10 size-[44rem] rounded-full bg-[#E10714]/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-56 bottom-[-18rem] -z-10 size-[40rem] rounded-full bg-[#E10714]/10 blur-3xl"
          />

        <motion.section
          className="relative isolate overflow-hidden bg-transparent py-14 sm:py-20"
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        whileInView={prefersReducedMotion ? undefined : { opacity: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.55 }}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-8 px-5 sm:px-6 md:flex-row md:items-end">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-3">
              <span className="h-px w-9 bg-[#ff4550]" />
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#ff6670]">Current collection</p>
            </div>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.04] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Find the kit that
              <span className="block text-white/35">feels like yours.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base font-normal leading-7 text-white/62">Explore the teams, kit designs and sleeve styles in our collection preview.</p>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"
          >
            <Link href="/customer-care#size-guide" className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-6 text-sm font-semibold text-white shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 hover:shadow-md">Read the fit guide</Link>
            <Link href="/shop" className="group inline-flex h-12 items-center justify-center gap-3 rounded-full bg-[#E10714] px-6 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(225,7,20,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#c90612] hover:shadow-[0_16px_34px_rgba(225,7,20,0.3)]">
              Explore the collection
              <span className="grid size-7 place-items-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5"><ArrowRight size={15} /></span>
            </Link>
          </motion.div>
        </div>
        </motion.section>

        <motion.section
          className="relative isolate overflow-hidden bg-transparent pb-14 pt-6 sm:pb-20 sm:pt-9"
        initial={prefersReducedMotion ? false : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.div
          aria-hidden="true"
          animate={prefersReducedMotion ? undefined : { x: [-18, 18, -18] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[150px] font-semibold tracking-[-0.06em] text-white/[0.018] sm:text-[220px]"
        >
          TISA
        </motion.div>
        <div className="mx-auto grid max-w-7xl gap-3 px-5 sm:px-6 md:grid-cols-3">
          {[
            { icon: BadgeCheck, title: "Choose your kit", text: "Explore Home, Away and Third kit designs." },
            { icon: Ruler, title: "Confirm your fit", text: "Compare a shirt you own with our measurement guide." },
            { icon: Eye, title: "A first look", text: "Browse the collection while we prepare for launch. Ordering is not open yet." },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              variants={{
                hidden: { opacity: 0, y: 28 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={prefersReducedMotion ? undefined : { y: -5 }}
              className="group relative flex min-h-40 gap-4 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.12)] backdrop-blur transition-[border-color,background-color,box-shadow] duration-300 hover:border-[#ff4550]/55 hover:bg-white/[0.07] hover:shadow-[0_18px_42px_rgba(225,7,20,0.14)] sm:p-6"
            >
              <span className="absolute right-4 top-2 text-5xl font-medium tracking-[-0.06em] text-white/[0.05] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-[#ff4550]/35">0{index + 1}</span>
              <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-[#ff4550] ring-1 ring-white/10 transition-all group-hover:scale-105 group-hover:bg-[#E10714] group-hover:text-white"><item.icon size={19} /></div>
              <div className="relative pt-1">
                <h2 className="text-base font-medium tracking-[-0.01em]">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-white/58">{item.text}</p>
              </div>
              <span className="absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 bg-[#ff4550] transition-transform duration-300 group-hover:scale-x-100" />
            </motion.div>
          ))}
        </div>
        </motion.section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
