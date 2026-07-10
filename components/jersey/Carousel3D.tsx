"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CarouselCard from "./CarouselCard";
import { playClickSFX } from "@/lib/sfx";
import {
  formatPriceAED,
  getFirstAvailableKit,
  getJerseyKitPrice,
  isJerseyKitAvailable,
  kitOptions,
  type Jersey,
  type KitVariant,
} from "@/lib/jerseys";

export default function Carousel3D({
  jerseys,
  onSelect,
}: {
  jerseys: Jersey[];
  onSelect?: (jersey: Jersey) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedKits, setSelectedKits] = useState<Record<string, KitVariant>>({});

  const total = jerseys.length;
  const current = jerseys[currentIndex];
  const currentColors = current?.country_colors ?? ["#00f0ff", "#ffffff", "#ff1f1f"];
  const selectedKit = current
    ? selectedKits[current.id] ?? getFirstAvailableKit(current)
    : "home";
  const selectedPrice = current ? getJerseyKitPrice(current, selectedKit) : 0;

  const next = useCallback(() => {
    playClickSFX(350);
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    playClickSFX(300);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const setCurrentKit = (kit: KitVariant) => {
    if (!current || !isJerseyKitAvailable(current, kit)) return;

    playClickSFX(420);
    setSelectedKits((previous) => ({
      ...previous,
      [current.id]: kit,
    }));
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  const getCardStyle = (index: number): React.CSSProperties => {
    let diff = index - currentIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    const absD = Math.abs(diff);
    const x = diff * 370;
    const z = -absD * 180;
    const rotY = diff * -18;
    const opacity = absD === 0 ? 1 : absD === 1 ? 0.62 : 0.28;
    const scale = absD === 0 ? 1 : absD === 1 ? 0.82 : 0.66;
    const zIndex = total - absD;

    return {
      transform: `translateX(${x}px) translateZ(${z}px) rotateY(${rotY}deg) scale(${scale})`,
      opacity,
      zIndex,
      pointerEvents: absD === 0 ? "auto" : "none",
    };
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* 3D Carousel Container */}
      <div
        className="relative mx-auto flex h-[350px] w-full max-w-6xl items-center justify-center sm:h-[400px] md:h-[500px] lg:h-[540px]"
        style={{ perspective: "1400px" }}
      >
        {jerseys.map((jersey, index) => (
          <div
            key={jersey.id}
            className="absolute transition-all duration-700 ease-out"
            style={{
              width: "min(84vw, 410px)",
              height: "min(92vw, 470px)",
              ...getCardStyle(index),
            }}
          >
            <CarouselCard
              jersey={jersey}
              isActive={index === currentIndex}
              selectedKit={selectedKits[jersey.id] ?? getFirstAvailableKit(jersey)}
              onClick={() => {
                if (index === currentIndex) {
                  playClickSFX(500);
                } else {
                  playClickSFX(350);
                  setCurrentIndex(index);
                }
              }}
            />
          </div>
        ))}
      </div>

      <div className="relative z-30 mt-0 flex w-[calc(100%-2.5rem)] max-w-md items-stretch justify-center gap-1 rounded-2xl border border-border/60 bg-background p-1 shadow-sm sm:gap-2">
        {kitOptions.map((kit) => {
          const available = current ? isJerseyKitAvailable(current, kit.id) : false;

          return (
            <button
              key={kit.id}
              type="button"
              onClick={() => {
                if (selectedKit === kit.id || !available) return;
                setCurrentKit(kit.id);
              }}
              disabled={!available}
              aria-disabled={!available}
              className={`relative min-h-11 flex-1 overflow-hidden rounded-xl px-2 text-xs font-semibold transition-colors sm:px-4 ${
                selectedKit === kit.id
                  ? "text-primary-foreground"
                  : available
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                    : "cursor-not-allowed text-muted-foreground/35"
              }`}
            >
              {selectedKit === kit.id && (
                <motion.span
                  layoutId="carousel-active-kit"
                  className="absolute inset-0 rounded-full bg-primary shadow-sm"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span
                className="relative z-10 mr-1.5 inline-block h-1.5 w-3 rounded-full align-middle"
                style={{
                  background:
                    kit.id === "home"
                      ? currentColors[0]
                      : kit.id === "away"
                        ? currentColors[1]
                        : (currentColors[2] ?? currentColors[0]),
                }}
              />
              <span className="relative z-10">{kit.label.replace(" Kit", "")}</span>
              {!available && <span className="relative z-10 block text-xs font-medium text-current opacity-75">Sold out</span>}
            </button>
          );
        })}
      </div>

      {/* Jersey Info HUD */}
      <div className="text-center max-w-xl mx-auto mt-1.5 z-20 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={current?.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {current?.collection}
            </span>
            <h2 className="text-[1.65rem] leading-tight md:text-4xl font-bold tracking-tight mt-0.5 font-display text-foreground">
              {current?.name}
            </h2>
            <p className="mx-auto mt-1 max-w-md line-clamp-2 text-sm leading-6 text-muted-foreground">
              {current?.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="z-30 mx-auto mt-3 grid w-full max-w-4xl grid-cols-[1fr_auto] items-center gap-3 px-5 md:grid-cols-3">
        <div className="justify-self-start text-left leading-none">
          <span className="mb-1 block text-xs text-muted-foreground">Selected kit</span>
          <span className="price-display text-xl sm:text-2xl">
            {selectedPrice > 0 ? formatPriceAED(selectedPrice) : "Price pending"}
          </span>
        </div>

        <div className="order-3 col-span-2 mt-1 flex items-center justify-center gap-4 md:order-none md:col-span-1 md:col-start-2 md:row-start-1 md:mt-0 md:gap-5">
          <button
            onClick={prev}
            aria-label="Previous jersey"
            className="w-10 h-10 rounded-full border border-border hover:border-primary hover:text-primary flex items-center justify-center transition-all bg-card/40 active:scale-90 md:h-11 md:w-11"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex gap-1.5">
            {jerseys.map((_, i) => (
              <button
                key={i}
                aria-label={`Show jersey ${i + 1}`}
                onClick={() => {
                  playClickSFX(300 + i * 40);
                  setCurrentIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex ? "bg-primary w-6" : "bg-muted-foreground/30 w-1.5"
                }`}
              />
            ))}
          </div>

          <button
            onClick={next}
            aria-label="Next jersey"
            className="w-10 h-10 rounded-full border border-border hover:border-primary hover:text-primary flex items-center justify-center transition-all bg-card/40 active:scale-90 md:h-11 md:w-11"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="col-start-2 row-start-1 justify-self-end md:col-start-3">
          <button
            onClick={() => current && onSelect?.(current)}
            className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:bg-primary/90 active:scale-95 sm:px-6"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
