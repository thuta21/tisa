"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, Minus, Plus, ShoppingBag } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import { useCart } from "@/lib/CartContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  formatPriceAED,
  getJerseyById,
  getJerseyKitImage,
  getJerseyKitPrice,
  isJerseyKitAvailable,
  kitImageFilters,
  kitOptions,
  getTeamPrintColor,
  isFontRelevantToJersey,
  type DbFont,
  type Jersey,
  type KitVariant,
} from "@/lib/jerseys";

const fontSelect = "id,name,slug,category,preview_text,price,created_at,updated_at";

function getJerseyPreviewUrl(fontSlug: string, text: string, color: string) {
  const params = new URLSearchParams({
    font: fontSlug,
    text,
    variant: "jersey",
    color,
    background: "#ffffff",
  });
  return `/api/font-preview?${params.toString()}`;
}

export default function JerseyDetail({ id }: { id: string }) {
  const jersey: Jersey | null = getJerseyById(id);
  const loading = false;
  const { addItem } = useCart();
  const [activeImage, setActiveImage] = useState("front");
  const [selectedKit, setSelectedKit] = useState<KitVariant>("home");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const [selectedBadge, setSelectedBadge] = useState("");
  const [prices, setPrices] = useState({ customization: 2, armBadge: 5 });
  const [added, setAdded] = useState(false);
  const [availableFonts, setAvailableFonts] = useState<DbFont[]>([]);
  const [selectedFontSlug, setSelectedFontSlug] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("commerce_settings")
      .select("customization_price, arm_badge_price")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrices({
            customization: data.customization_price,
            armBadge: data.arm_badge_price,
          });
        }
      });

    supabase
      .from("fonts")
      .select(fontSelect)
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data }) => {
        const dbFonts = (data ?? []) as DbFont[];
        const relevantFonts = jersey
          ? dbFonts.filter((font) => isFontRelevantToJersey(font, jersey))
          : dbFonts;
        const nextFonts = relevantFonts.length ? relevantFonts : dbFonts;
        setAvailableFonts(nextFonts);
        setSelectedFontSlug((current) => current || nextFonts[0]?.slug || "");
      });
  }, []);

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
    { label: "Season", value: jersey.season },
    { label: "Sizes", value: jersey.sizes?.join(" / ") },
  ].filter((s) => s.value);
  const [primaryColor, secondaryColor, tertiaryColor = secondaryColor] = jersey.country_colors;
  const kitImage = getJerseyKitImage(jersey, selectedKit);
  const displayImage = activeImage === "front" ? kitImage : (jersey.image_back || kitImage);
  const imageFilter = `drop-shadow(0 25px 40px rgba(0,0,0,0.34)) ${kitImageFilters[selectedKit]}`;
  const selectedPrice = getJerseyKitPrice(jersey, selectedKit);

  const hasCustomization = !!(customName.trim() || customNumber.trim());
  const customizationFee = hasCustomization ? prices.customization : 0;
  const armBadgeFee = selectedBadge ? prices.armBadge : 0;
  const lineItemUnitPrice = selectedPrice + customizationFee + armBadgeFee;
  const printColor = getTeamPrintColor(jersey, selectedKit);
  const customizationPreviewText = `${customName.trim() || "PLAYER"} ${customNumber.trim() || "10"}`;

  const handleAddToCart = () => {
    if (!selectedSize) return;
    addItem({
      jerseyId: jersey.id,
      kit: selectedKit,
      size: selectedSize,
      quantity,
      unitPrice: selectedPrice,
      customName: customName.trim() || undefined,
      customNumber: customNumber.trim() || undefined,
      fontSlug: selectedFontSlug || undefined,
      armBadge: selectedBadge || undefined,
      customizationFee,
      armBadgeFee,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

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

                <div className="relative flex h-[430px] items-center justify-center p-4 sm:h-[520px] lg:h-[calc(100vh-310px)] lg:min-h-[480px] lg:max-h-[620px]">
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
                  {activeImage === "back" && (customName.trim() || customNumber.trim()) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                      <img
                        src={getJerseyPreviewUrl(selectedFontSlug, customizationPreviewText, printColor)}
                        alt="Customization preview"
                        className="w-[190px] sm:w-[230px] translate-y-[-28px] mix-blend-multiply"
                        draggable={false}
                      />
                    </div>
                  )}
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
                <span className="text-3xl font-bold text-primary font-display">{formatPriceAED(lineItemUnitPrice)}</span>
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

              <div className="mt-6 border-t border-border pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground">Select size</h3>
                  <Link href="/contact" className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground underline underline-offset-4 hover:text-foreground">
                    Sizing help
                  </Link>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {jersey.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`h-10 rounded-lg border text-xs font-semibold transition-colors ${
                        selectedSize === size
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Shirt name <span className="normal-case tracking-normal">(optional, +{formatPriceAED(prices.customization)})</span>
                    <input
                      value={customName}
                      onChange={(event) => setCustomName(event.target.value.slice(0, 12).toUpperCase())}
                      placeholder="MESSI"
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm uppercase tracking-normal text-foreground outline-none focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Number <span className="normal-case tracking-normal">(optional, +{formatPriceAED(prices.customization)})</span>
                    <input
                      value={customNumber}
                      onChange={(event) => setCustomNumber(event.target.value.replace(/\D/g, "").slice(0, 2))}
                      inputMode="numeric"
                      placeholder="10"
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm tracking-normal text-foreground outline-none focus:border-primary"
                    />
                  </label>
                </div>

                <div className="mt-4">
                  <label className="grid gap-1.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Font style <span className="normal-case tracking-normal">(secure preview)</span>
                    <select
                      value={selectedFontSlug}
                      onChange={(event) => setSelectedFontSlug(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                    >
                      {availableFonts.length === 0 ? (
                        <option value="">Default print font</option>
                      ) : (
                        availableFonts.map((font) => (
                          <option key={font.id} value={font.slug}>
                            {font.name} ({font.category})
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                </div>

                <div className="mt-4">
                  <label className="grid gap-1.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Arm badge <span className="normal-case tracking-normal">(optional)</span>
                    <select
                      value={selectedBadge}
                      onChange={(event) => setSelectedBadge(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                    >
                      <option value="">No badge</option>
                      <option value="ucl">UCL Badge (+{formatPriceAED(prices.armBadge)})</option>
                      <option value="epl">EPL Badge (+{formatPriceAED(prices.armBadge)})</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Quantity</span>
                  <div className="flex items-center rounded-full border border-border p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      className="flex size-8 items-center justify-center rounded-full hover:bg-muted"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.min(10, current + 1))}
                      className="flex size-8 items-center justify-center rounded-full hover:bg-muted"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!selectedSize}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {added ? <Check size={15} /> : <ShoppingBag size={15} />}
                  {added ? "Added to Bag" : `Add to Bag - ${formatPriceAED(lineItemUnitPrice * quantity)}`}
                </button>
                <Link
                  href="/cart"
                  aria-label="View bag"
                  className="flex size-12 items-center justify-center rounded-full border border-border hover:border-primary hover:text-primary"
                >
                  <ShoppingBag size={16} />
                </Link>
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
    </div>
  );
}
