"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CarouselCard from "./CarouselCard";
import { playClickSFX } from "@/lib/sfx";
import {
  formatPriceMMK,
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
  const backgroundTextColor = currentColors[0] === "#ffffff" ? (currentColors[2] ?? currentColors[1]) : currentColors[0];

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
    const x = diff * 285;
    const z = -absD * 150;
    const rotY = diff * -20;
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
      <div
        className="absolute inset-x-0 top-0 h-[300px] pointer-events-none opacity-45 blur-2xl md:h-[420px]"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${currentColors[1]}33 0%, transparent 28%), radial-gradient(circle at 25% 45%, ${currentColors[0]}26 0%, transparent 34%), radial-gradient(circle at 75% 48%, ${(currentColors[2] ?? currentColors[0])}24 0%, transparent 32%)`,
        }}
      />
      {/* Dynamic Background Text */}
      <div className="absolute inset-x-0 top-[38%] -translate-y-1/2 flex justify-center pointer-events-none z-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_66%,transparent)]">
        <AnimatePresence mode="wait">
          <motion.h1
            key={current?.team}
            initial={{ opacity: 0, scale: 0.9, filter: "blur(20px)" }}
            animate={{ opacity: 0.09, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
            transition={{ duration: 0.8 }}
            className="text-[13vw] font-black uppercase text-center tracking-normal font-display whitespace-nowrap"
            style={{
              color: backgroundTextColor,
              textShadow: `0 18px 80px ${backgroundTextColor}55`,
            }}
          >
            {current?.team}
          </motion.h1>
        </AnimatePresence>
      </div>

      {/* 3D Carousel Container */}
      <div
        className="relative mx-auto flex h-[290px] w-full max-w-5xl items-center justify-center sm:h-[320px] md:h-[380px]"
        style={{ perspective: "1200px" }}
      >
        {/* Floor Grid */}
        <div
          className="absolute h-[360px] w-[360px] rounded-full border border-primary/5 pointer-events-none md:h-[500px] md:w-[500px]"
          style={{
            background: `radial-gradient(circle, ${currentColors[1]}1f 0%, ${currentColors[0]}12 42%, transparent 70%)`,
            transform: "rotateX(85deg) translateY(180px)",
          }}
        />

        {jerseys.map((jersey, index) => (
          <div
            key={jersey.id}
            className="absolute transition-all duration-700 ease-out"
            style={{
              width: "min(82vw, 300px)",
              height: "min(78vw, 330px)",
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

      <div className="relative z-30 mt-0 flex items-center justify-center gap-1 rounded-full border border-border/60 bg-background/70 p-1 shadow-sm backdrop-blur-md sm:gap-2">
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
              className={`relative h-8 overflow-hidden rounded-full px-3 text-[9px] font-semibold uppercase tracking-[0.1em] transition-colors sm:h-9 sm:px-4 sm:text-[10px] ${
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
                className="relative z-10 mr-1.5 inline-block h-1.5 w-4 rounded-full align-middle"
                style={{
                  background:
                    kit.id === "home"
                      ? currentColors[0]
                      : kit.id === "away"
                        ? currentColors[1]
                        : (currentColors[2] ?? currentColors[0]),
                }}
              />
              <span className="relative z-10">{kit.label}</span>
              {!available && <span className="relative z-10 ml-1 hidden text-[8px] sm:inline">OOS</span>}
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
            <span className="text-[9px] uppercase tracking-[0.25em] text-primary font-mono font-semibold sm:text-[10px]">
              {current?.collection}
            </span>
            <h2 className="text-[1.65rem] leading-tight md:text-4xl font-bold tracking-tight mt-0.5 font-display text-foreground">
              {current?.name}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1 leading-relaxed max-w-md mx-auto font-body line-clamp-2">
              {current?.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="grid w-full max-w-4xl grid-cols-3 items-center gap-3 mx-auto mt-2.5 z-30 px-4">
        <div className="justify-self-start text-left leading-none">
          <span className="text-[9px] text-muted-foreground block uppercase tracking-[0.2em] font-mono">Premium Retail</span>
          <span className="text-base font-bold text-primary font-display sm:text-xl">
            {formatPriceMMK(selectedPrice)}
          </span>
        </div>

        <div className="col-start-2 flex items-center justify-center gap-4 md:gap-5">
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

        <div className="justify-self-end">
          <button
            onClick={() => current && onSelect?.(current)}
            className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[9px] uppercase tracking-[0.12em] rounded-full shadow-lg shadow-primary/10 transition-all hover:scale-105 active:scale-95 font-mono sm:px-6 sm:text-[10px]"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
