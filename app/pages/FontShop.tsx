"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import { useCart } from "@/lib/CartContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPriceAED, type DbFont } from "@/lib/jerseys";
import { Download, ShoppingBag, Check } from "lucide-react";
import { motion } from "framer-motion";

const fontSelect = "id,name,slug,category,preview_text,price,created_at,updated_at";

function getFontPreviewUrl(font: DbFont, text: string) {
  const params = new URLSearchParams({
    font: font.slug,
    text: text || font.preview_text || "CHAMPIONS 10",
  });
  return `/api/font-preview?${params.toString()}`;
}

export default function FontShop() {
  const [fonts, setFonts] = useState<DbFont[]>([]);
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState("All");
  const { addItem } = useCart();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("fonts")
      .select(fontSelect)
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setFonts(data as DbFont[]);
          const initialPreviews: Record<string, string> = {};
          data.forEach((font: DbFont) => {
            initialPreviews[font.id] = font.preview_text || "CHAMPIONS 10";
          });
          setPreviews(initialPreviews);
        }
        setLoading(false);
      });
  }, []);

  const handlePreviewChange = (fontId: string, text: string) => {
    setPreviews((prev) => ({
      ...prev,
      [fontId]: text.toUpperCase().slice(0, 20),
    }));
  };

  const handleAddToBag = (font: DbFont) => {
    addItem({
      jerseyId: font.id,
      kit: "home",
      size: "Font File",
      quantity: 1,
      unitPrice: font.price,
      customName: font.name,
      customNumber: font.slug,
    });

    setAddedIds((prev) => ({ ...prev, [font.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [font.id]: false }));
    }, 1800);
  };

  const categories = ["All", ...Array.from(new Set(fonts.map((font) => font.category || "Uncategorized")))];
  const visibleFonts = activeCategory === "All"
    ? fonts
    : fonts.filter((font) => (font.category || "Uncategorized") === activeCategory);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">TISA Customization</p>
            <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight mt-1">Font Shop</h1>
            <p className="text-muted-foreground mt-3 font-body max-w-xl">
              Purchase premium team-specific fonts individually to use in your own sports designs and customization projects.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : fonts.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-card">
              <Download size={32} className="mx-auto text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground font-mono">No fonts available in the shop yet.</p>
            </div>
          ) : (
            <>
              <div className="mb-7 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`h-10 rounded-full border px-4 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                      activeCategory === category
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {visibleFonts.map((font, i) => {
                const previewText = previews[font.id] || "";
                const isAdded = addedIds[font.id];

                return (
                  <motion.div
                    key={font.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="border border-border bg-card rounded-2xl overflow-hidden p-6 flex flex-col justify-between hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div>
                          <span className="text-[9px] uppercase tracking-[0.15em] font-mono text-muted-foreground">{font.category || "Digital Font File"}</span>
                          <h3 className="text-xl font-bold font-display mt-0.5">{font.name}</h3>
                        </div>
                        <span className="text-lg font-bold text-primary font-display">{formatPriceAED(font.price)}</span>
                      </div>

                      <div className="relative h-32 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden mb-5">
                        <span className="absolute top-2 left-3 text-[8px] font-mono uppercase tracking-widest text-muted-foreground select-none">
                          Secure Image Preview
                        </span>
                        <img
                          src={getFontPreviewUrl(font, previewText)}
                          alt={`${font.name} preview`}
                          className="h-full w-full object-cover select-none"
                          draggable={false}
                        />
                      </div>

                      {/* Controls */}
                      <div className="grid gap-3 mb-6">
                        <label className="grid gap-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                          Test custom text
                          <input
                            type="text"
                            value={previewText}
                            onChange={(e) => handlePreviewChange(font.id, e.target.value)}
                            placeholder="Type to try..."
                            maxLength={20}
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm tracking-normal text-foreground outline-none focus:border-primary w-full"
                          />
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToBag(font)}
                      className={`flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-xs font-bold uppercase tracking-[0.14em] transition-all ${
                        isAdded
                          ? "bg-emerald-600 text-white"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check size={14} /> Added to Bag
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={14} /> Buy Font File
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
