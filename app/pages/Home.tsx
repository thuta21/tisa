"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, BadgeCheck, ClipboardCheck, Ruler } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import FeaturedJerseyShowcase from "@/components/jersey/FeaturedJerseyShowcase";
import { jerseys as fallbackJerseys, type Jersey } from "@/lib/jerseys";
import { loadCatalogJerseys } from "@/lib/products";

export default function Home() {
  const router = useRouter();
  const processRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress: processScroll } = useScroll({
    target: processRef,
    offset: ["start end", "end start"],
  });
  const processParallaxX = useTransform(processScroll, [0, 1], [-70, 70]);
  const [jerseys, setJerseys] = useState<Jersey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    loadCatalogJerseys()
      .then((items) => {
        if (!mounted) return;

        const featuredItems = items.filter((item) => item.featured);
        setJerseys(
          featuredItems.length > 0
            ? featuredItems
            : items.length > 0
              ? items
              : fallbackJerseys.filter((item) => item.featured),
        );
      })
      .catch(() => {
        if (mounted) setJerseys(fallbackJerseys.filter((item) => item.featured));
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
    <div className="tisa-page-surface min-h-screen text-foreground flex flex-col">
      <Navbar />

      <div className="tisa-page-surface">
        <main>
        {jerseys.length > 0 ? (
          <FeaturedJerseyShowcase
            jerseys={jerseys}
            onSelect={(jersey) => {
              if ("slug" in jersey && typeof jersey.slug === "string") {
                router.push(`/jersey/${jersey.slug}`);
                return;
              }
              router.push("/shop");
            }}
          />
        ) : (
          <div className="text-center py-24">
            <p className="text-muted-foreground font-mono text-sm">No jerseys available yet.</p>
          </div>
        )}
        </main>

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
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff4550]">Current collection</p>
            </div>
            <h2 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              Find the kit that
              <span className="block text-white/35">feels like yours.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/50">Compare every available team, kit version and size in one clear collection.</p>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"
          >
            <Link href="/shop?sort=newest" className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-6 text-sm font-semibold text-white shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 hover:shadow-md">View new arrivals</Link>
            <Link href="/shop" className="group inline-flex h-12 items-center justify-center gap-3 rounded-full bg-[#E10714] px-6 text-sm font-bold text-white shadow-[0_12px_28px_rgba(225,7,20,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#c90612] hover:shadow-[0_16px_34px_rgba(225,7,20,0.35)]">
              Shop all jerseys
              <span className="grid size-7 place-items-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5"><ArrowRight size={15} /></span>
            </Link>
          </motion.div>
        </div>
        </motion.section>

        <motion.section
          ref={processRef}
          className="relative isolate overflow-hidden bg-transparent pb-14 pt-6 sm:pb-20 sm:pt-9"
        initial={prefersReducedMotion ? false : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.div
          aria-hidden="true"
          style={{ x: prefersReducedMotion ? undefined : processParallaxX }}
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[150px] font-black tracking-[-0.08em] text-white/[0.018] sm:text-[220px]"
        >
          TISA
        </motion.div>
        <div className="mx-auto grid max-w-7xl gap-3 px-5 sm:px-6 md:grid-cols-3">
          {[
            { icon: BadgeCheck, title: "Choose your kit", text: "See which Home, Away and Third versions are currently available." },
            { icon: Ruler, title: "Confirm your fit", text: "Measure a shirt you own and check the available sizes before ordering." },
            { icon: ClipboardCheck, title: "Review your order", text: "Delivery and payment details are confirmed during order review." },
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
              <span className="absolute right-4 top-2 text-5xl font-black tracking-[-0.08em] text-white/[0.045] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-[#ff4550]/35">0{index + 1}</span>
              <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-[#ff4550] ring-1 ring-white/10 transition-all group-hover:scale-105 group-hover:bg-[#E10714] group-hover:text-white"><item.icon size={19} /></div>
              <div className="relative pt-1">
                <h2 className="text-base font-bold tracking-tight">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-white/45">{item.text}</p>
              </div>
              <span className="absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 bg-[#ff4550] transition-transform duration-300 group-hover:scale-x-100" />
            </motion.div>
          ))}
        </div>
        </motion.section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
