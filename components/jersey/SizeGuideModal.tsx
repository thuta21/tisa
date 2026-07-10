"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Ruler, X } from "lucide-react";
import { playerVersionSizeChart } from "@/lib/size-guide";

export default function SizeGuideModal({
  open,
  onClose,
  availableSizes,
}: {
  open: boolean;
  onClose: () => void;
  availableSizes: string[];
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-[42rem] flex-col bg-background shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 330, damping: 34 }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Ruler size={18} /></span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Player version jersey</p>
                  <h2 id="size-guide-title" className="mt-1 text-2xl font-bold tracking-tight">Size guide</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Compare the chart with the sizes available for this kit.</p>
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label="Close size guide" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"><X size={18} /></button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
              <section>
                <div className="flex items-end justify-between gap-3"><div><h3 className="text-lg font-bold">Find your recommended size</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Length and chest values are in centimetres. Height and weight are a general guide.</p></div><span className="text-xs text-muted-foreground">Swipe table →</span></div>
                <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                  <table className="min-w-[600px] w-full border-collapse text-left text-sm">
                    <thead className="bg-muted text-xs font-semibold text-muted-foreground"><tr><th className="px-3 py-3">Size</th><th className="px-3 py-3">Length<br />(cm)</th><th className="px-3 py-3">Chest<br />(cm)</th><th className="px-3 py-3">Height<br />(cm)</th><th className="px-3 py-3">Weight<br />(kg)</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {playerVersionSizeChart.map((row) => {
                        const available = availableSizes.includes(row.size);
                        return <tr key={row.size} className={available ? "bg-primary/[0.04]" : "text-muted-foreground"}><td className="px-3 py-3 font-bold text-foreground"><span className="inline-flex items-center gap-1.5">{row.size}{available && <Check size={14} className="text-primary" />}</span></td><td className="px-3 py-3">{row.length}</td><td className="px-3 py-3">{row.chest}</td><td className="px-3 py-3">{row.height}<span className="mt-0.5 block text-xs text-muted-foreground">{row.feet}</span></td><td className="px-3 py-3">{row.weight}</td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground"><span className="mr-1 inline-block size-2 rounded-full bg-primary" />Highlighted sizes are in stock for the selected kit.</p>
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

            <footer className="border-t border-border p-4 sm:px-7 sm:py-5"><button type="button" onClick={onClose} className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">Continue choosing size</button></footer>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function Measurement({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{number}</span><div><h4 className="text-sm font-semibold">{title}</h4><p className="mt-0.5 text-sm leading-6 text-muted-foreground">{text}</p></div></div>;
}
