"use client";

import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Ruler, X } from "lucide-react";
import ResponsiveSizeChart from "@/components/jersey/ResponsiveSizeChart";

export default function SizeGuideModal({
  open,
  onClose,
  availableSizes = [],
}: {
  open: boolean;
  onClose: () => void;
  availableSizes?: string[];
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []).filter(button => button.getClientRects().length > 0);
        const first = buttons?.[0];
        const last = buttons?.[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.button
            type="button"
            aria-label="Close size guide"
            className="absolute inset-0 cursor-default bg-black/35"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-title"
            className="absolute inset-y-0 right-0 flex h-dvh w-full max-w-[42rem] flex-col bg-background shadow-2xl"
            initial={prefersReducedMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { x: "100%" }}
            transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 330, damping: 34 }}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-7 sm:py-6">
              <div className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Ruler size={18} /></span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Player version jersey</p>
                  <h2 id="size-guide-title" className="mt-1 text-2xl font-bold tracking-tight">Size guide</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Compare the chart with a shirt you already own.</p>
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label="Close size guide" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"><X size={18} /></button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-7">
              <section>
                <h3 className="text-lg font-bold">Find your recommended size</h3>
                <p className="mb-4 mt-1 text-sm leading-6 text-muted-foreground">Compare length and chest width with a shirt you own. Height and weight are a general guide.</p>
                <ResponsiveSizeChart availableSizes={availableSizes} />
              </section>

              <section className="mt-8 border-t border-border pt-6">
                <h3 className="text-lg font-bold">How to measure</h3>
                <div className="mt-4 space-y-4">
                  <Measurement number="1" title="Length" text="Measure from the highest point of the shoulder down to the bottom hem." />
                  <Measurement number="2" title="Chest" text="Measure straight across the chest, about 1 cm below the armhole." />
                  <Measurement number="3" title="Shoulder" text="Measure from shoulder seam to shoulder seam." />
                  <Measurement number="4" title="Sleeve length" text="Measure from the shoulder seam to the end of the sleeve." />
                </div>
              </section>

              <div className="mt-7 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                <p className="font-semibold">Before you choose</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 opacity-85"><li>Manual measurements can vary by 1–3 cm.</li><li>For a slim fit, consider one size down.</li><li>For a loose fit, consider one size up.</li></ul>
              </div>
            </div>

            <footer className="shrink-0 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7 sm:py-5"><button type="button" onClick={onClose} className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">Back to jersey details</button></footer>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function Measurement({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{number}</span><div><h4 className="text-sm font-semibold">{title}</h4><p className="mt-0.5 text-sm leading-6 text-muted-foreground">{text}</p></div></div>;
}
