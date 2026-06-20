"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import PerformanceBar from "@/components/jersey/PerformanceBar";
import OrderPanel from "@/components/jersey/OrderPanel";
import {
  getJerseyById,
  getJerseyKitImage,
  getJerseyKitPrice,
  isJerseyKitAvailable,
  kitImageFilters,
  kitOptions,
  type Jersey,
  type KitVariant,
} from "@/lib/jerseys";

export default function JerseyDetail({ id }: { id: string }) {
  const jersey: Jersey | null = getJerseyById(id);
  const loading = false;
  const [showOrder, setShowOrder] = useState(false);
  const [activeImage, setActiveImage] = useState("front");
  const [selectedKit, setSelectedKit] = useState<KitVariant>("home");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!jersey) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center">
            <p className="text-muted-foreground font-mono">Jersey not found</p>
            <Link href="/shop" className="text-primary text-sm mt-4 inline-block font-mono hover:underline">Back to Shop</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const specs = [
    { label: "Fabric", value: jersey.fabric },
    { label: "Weight", value: `${jersey.weight_gsm} GSM` },
    { label: "Season", value: jersey.season },
    { label: "Sizes", value: jersey.sizes?.join(" / ") },
  ].filter((s) => s.value);
  const [primaryColor, secondaryColor, tertiaryColor = secondaryColor] = jersey.country_colors;
  const kitImage = getJerseyKitImage(jersey, selectedKit);
  const displayImage = activeImage === "front" ? kitImage : (jersey.image_back || kitImage);
  const imageFilter = `drop-shadow(0 25px 40px rgba(0,0,0,0.34)) ${kitImageFilters[selectedKit]}`;
  const selectedPrice = getJerseyKitPrice(jersey, selectedKit);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground mb-6">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight size={10} />
            <Link href="/shop" className="hover:text-primary transition-colors">Roster</Link>
            <ChevronRight size={10} />
            <span className="text-foreground">{jersey.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-16">
            {/* Left — Image Gallery */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div
                className="relative overflow-hidden rounded-2xl"
                style={{
                  background: `linear-gradient(145deg, ${primaryColor}0f, transparent 48%, ${tertiaryColor}0d)`,
                }}
              >
                <div
                  className="absolute inset-0 opacity-[0.04] pointer-events-none"
                  style={{ background: `radial-gradient(circle at center, ${secondaryColor}, transparent 70%)` }}
                />

                <div className="flex h-[430px] items-center justify-center p-4 sm:h-[520px] lg:h-[calc(100vh-310px)] lg:min-h-[480px] lg:max-h-[620px]">
                  <motion.img
                    key={`${activeImage}-${selectedKit}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    src={displayImage}
                    alt={jersey.name}
                    className="h-full w-full object-contain select-none"
                    style={{ filter: imageFilter }}
                  />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-center gap-1 rounded-full border border-border/60 bg-background/80 p-1 shadow-sm">
                {kitOptions.map((kit) => {
                  const available = isJerseyKitAvailable(jersey, kit.id);

                  return (
                    <button
                      key={kit.id}
                      type="button"
                      onClick={() => available && setSelectedKit(kit.id)}
                        disabled={!available}
                        aria-disabled={!available}
                        className={`relative h-8 flex-1 overflow-hidden rounded-full px-2 text-[9px] font-semibold uppercase tracking-[0.1em] transition-colors sm:text-[10px] ${
                          selectedKit === kit.id
                            ? "text-primary-foreground"
                            : available
                              ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                              : "cursor-not-allowed text-muted-foreground/35"
                        }`}
                      >
                        {selectedKit === kit.id && (
                          <motion.span
                            layoutId="detail-active-kit"
                            className="absolute inset-0 rounded-full bg-primary"
                            transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          />
                        )}
                        <span className="relative z-10">{kit.label}</span>
                        {!available && <span className="relative z-10 ml-1 hidden text-[8px] sm:inline">OOS</span>}
                      </button>
                    );
                  })}
              </div>

              <div className="flex gap-2 mt-2">
                {["front", "back"].map((side) => (
                  <button
                    key={side}
                    onClick={() => setActiveImage(side)}
                    className={`flex-1 py-2 rounded-lg text-[10px] uppercase tracking-[0.12em] font-mono border transition-all ${
                      activeImage === side
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {side} View
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Right — Spec Sheet */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="flex flex-col"
            >
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-mono font-semibold">
                {jersey.collection}
              </span>
              <h1 className="text-3xl md:text-4xl font-black font-display tracking-tight mt-2">
                {jersey.name}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed mt-3 font-body">
                {jersey.description}
              </p>

              <div className="flex items-baseline gap-3 mt-5">
                <span className="text-3xl font-bold text-primary font-display">${selectedPrice.toFixed(2)}</span>
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">USD</span>
              </div>

              {/* Performance Matrix */}
              <div className="mt-6 p-5 bg-card border border-border rounded-xl space-y-4">
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-4">Performance Matrix</h3>
                {jersey.breathability && <PerformanceBar label="Breathability" value={jersey.breathability} delay={0.1} />}
                {jersey.durability && <PerformanceBar label="Durability" value={jersey.durability} delay={0.2} />}
                {jersey.moisture_wicking && <PerformanceBar label="Moisture Wicking" value={jersey.moisture_wicking} delay={0.3} />}
              </div>

              {/* Technical Specs */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                {specs.map((spec) => (
                  <div key={spec.label} className="p-3 bg-card border border-border rounded-lg">
                    <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono block">{spec.label}</span>
                    <span className="text-sm font-semibold font-mono mt-0.5 block text-foreground">{spec.value}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowOrder(true)}
                  className="flex-1 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-[0.15em] rounded-full shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-95 font-mono"
                >
                  Order Now — ${selectedPrice.toFixed(2)}
                </button>
              </div>

              <Link href="/shop" className="flex items-center gap-2 text-muted-foreground hover:text-primary text-xs font-mono mt-5 transition-colors">
                <ArrowLeft size={12} />
                Back to Roster
              </Link>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
      <OrderPanel jersey={jersey} open={showOrder} onClose={() => setShowOrder(false)} />
    </div>
  );
}
