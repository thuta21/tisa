"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, ClipboardCheck, Minus, Plus, RotateCcw, ShoppingBag, Truck } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import SizeGuideModal from "@/components/jersey/SizeGuideModal";
import { useCart } from "@/lib/CartContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  formatPriceAED,
  getJerseyKitImage,
  getJerseyKitPrice,
  isJerseyKitAvailable,
  kitImageFilters,
  kitOptions,
  getTeamPrintColor,
  isFontRelevantToJersey,
  type DbFont,
  type KitVariant,
} from "@/lib/jerseys";
import { loadCatalogJersey, type CatalogJersey, type CatalogJerseyKit } from "@/lib/products";

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
  const [jersey, setJersey] = useState<CatalogJersey | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadCatalogJersey(id)
      .then((item) => {
        if (!mounted) return;
        setJersey(item);
        if (item) {
          const firstKit = kitOptions.find((kit) => item.kits[kit.id]?.available)?.id ?? "home";
          setSelectedKit(firstKit);
          setSelectedSize("");
          setQuantity(1);
        }
      })
      .catch(() => {
        if (mounted) setJersey(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

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
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
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
  }, [jersey]);

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
  const selectedKitData = jersey.kits[selectedKit] as CatalogJerseyKit;
  const selectedKitSizes = selectedKitData.sizes;
  const selectedSizeStock = selectedSize ? (selectedKitData.stockBySize[selectedSize] ?? 0) : selectedKitData.stock;
  const maximumQuantity = Math.min(10, selectedSizeStock);
  const displayImage = activeImage === "front" ? kitImage : (selectedKitData.imageBack || jersey.image_back || kitImage);
  const imageFilter = `drop-shadow(0 25px 40px rgba(0,0,0,0.34)) ${kitImageFilters[selectedKit]}`;
  const selectedPrice = getJerseyKitPrice(jersey, selectedKit);

  const hasCustomization = !!(customName.trim() || customNumber.trim());
  const customizationFee = hasCustomization ? prices.customization : 0;
  const armBadgeFee = selectedBadge ? prices.armBadge : 0;
  const lineItemUnitPrice = selectedPrice + customizationFee + armBadgeFee;
  const printColor = getTeamPrintColor(jersey, selectedKit);
  const customizationPreviewText = `${customName.trim() || "PLAYER"} ${customNumber.trim() || "10"}`;

  const handleAddToCart = () => {
    if (!selectedSize || !selectedKitData.variantId || selectedSizeStock < 1 || selectedPrice <= 0) return;
    addItem({
      jerseyId: jersey.id,
      productId: jersey.productId,
      variantId: selectedKitData.variantId,
      productName: jersey.name,
      variantName: selectedKitData.variantName ?? kitOptions.find((kit) => kit.id === selectedKit)?.label ?? selectedKit,
      imageUrl: selectedKitData.image,
      productSlug: jersey.slug,
      kit: selectedKit,
      size: selectedSize,
      quantity,
      maxQuantity: selectedSizeStock,
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

      <main className="flex-1 pb-28 pt-24 sm:pt-28 lg:pb-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight size={10} />
            <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
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
                    onError={(event) => {
                      event.currentTarget.src = "/assets/tisa-shirt.png";
                    }}
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

              <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl border border-border/60 bg-background p-1 shadow-sm">
                {kitOptions.map((kit) => {
                  const available = isJerseyKitAvailable(jersey, kit.id);
                  const stock = (jersey.kits[kit.id] as CatalogJerseyKit).stock;

                  return (
                    <button
                      key={kit.id}
                      type="button"
                      onClick={() => {
                        if (!available) return;
                        setSelectedKit(kit.id);
                        setSelectedSize("");
                        setQuantity(1);
                      }}
                        disabled={!available}
                        aria-disabled={!available}
                        className={`relative min-h-12 overflow-hidden rounded-xl px-2 py-1 text-sm font-medium transition-colors ${
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
                        <span className="relative z-10 block">{kit.label.replace(" Kit", "")}</span>
                        {!available && <span className="relative z-10 block text-xs font-normal normal-case tracking-normal opacity-75">Sold out</span>}
                        {available && stock <= 3 && <span className="relative z-10 block text-xs font-normal normal-case tracking-normal opacity-75">Only {stock} left</span>}
                      </button>
                    );
                  })}
              </div>

              <div className="flex gap-2 mt-2">
                {["front", "back"].map((side) => (
                  <button
                    key={side}
                    onClick={() => setActiveImage(side)}
                    className={`min-h-10 flex-1 rounded-lg border text-sm font-medium transition-all ${
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
              <span className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                {jersey.collection}
              </span>
              <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                {jersey.name}
              </h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                {jersey.description}
              </p>

              <div className="mt-6 flex items-baseline gap-3">
                <span className="price-display text-4xl sm:text-5xl">{selectedPrice > 0 ? formatPriceAED(lineItemUnitPrice) : "Price pending"}</span>
                {selectedSize && selectedSizeStock > 0 && selectedSizeStock <= 3 && <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Only {selectedSizeStock} left in {selectedSize}</span>}
              </div>

              {/* Technical Specs */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                {specs.map((spec) => (
                  <div key={spec.label} className="rounded-xl border border-border bg-card p-3.5">
                    <span className="block text-xs font-medium text-muted-foreground">{spec.label}</span>
                    <span className="mt-1 block text-base font-semibold text-foreground">{spec.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-border pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">Select your size</h3>
                  <button type="button" onClick={() => setSizeGuideOpen(true)} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">Size guide</button>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {selectedKitSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setQuantity(1);
                      }}
                      className={`h-11 rounded-lg border text-base font-semibold transition-colors ${
                        selectedSize === size
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                  {selectedKitSizes.length === 0 && (
                    <p className="col-span-4 rounded-lg border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground sm:col-span-5">
                      This kit is currently out of stock.
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-end justify-between gap-3">
                  <div><h3 className="text-base font-semibold">Name & number</h3><p className="mt-0.5 text-sm text-muted-foreground">Optional · {formatPriceAED(prices.customization)} total when either field is used</p></div>
                  <Link href="/fonts" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">View styles</Link>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Shirt name
                    <input
                      value={customName}
                      onChange={(event) => setCustomName(event.target.value.slice(0, 12).toUpperCase())}
                      placeholder="MESSI"
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm uppercase tracking-normal text-foreground outline-none focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Number
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
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Font style
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
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
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

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-base font-semibold">Quantity</span>
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
                      onClick={() => setQuantity((current) => Math.min(maximumQuantity, current + 1))}
                      disabled={!selectedSize || maximumQuantity < 1 || quantity >= maximumQuantity}
                      className="flex size-8 items-center justify-center rounded-full hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
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
                  disabled={!selectedSize || !selectedKitData.variantId || selectedKitData.stock < 1 || selectedPrice <= 0}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {added ? <Check size={15} /> : <ShoppingBag size={15} />}
                  {added ? "Added to bag" : selectedKitData.stock < 1 ? "Sold out" : selectedPrice <= 0 ? "Price pending" : !selectedSize ? "Select a size" : `Add to bag · ${formatPriceAED(lineItemUnitPrice * quantity)}`}
                </button>
                <Link
                  href="/cart"
                  aria-label="View bag"
                  className="flex size-12 items-center justify-center rounded-full border border-border hover:border-primary hover:text-primary"
                >
                  <ShoppingBag size={16} />
                </Link>
              </div>

              <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card/50 px-4">
                <Link href="/customer-care#delivery" className="flex items-center gap-3 py-4"><Truck size={18} className="shrink-0 text-primary" /><div><p className="text-sm font-semibold">Delivery reviewed before fulfilment</p><p className="mt-0.5 text-xs text-muted-foreground">Fee and timing are confirmed with the order.</p></div><ChevronRight size={15} className="ml-auto text-muted-foreground" /></Link>
                <Link href="/customer-care#exchanges" className="flex items-center gap-3 py-4"><RotateCcw size={18} className="shrink-0 text-primary" /><div><p className="text-sm font-semibold">Check exchange eligibility</p><p className="mt-0.5 text-xs text-muted-foreground">Confirm the size before adding customization.</p></div><ChevronRight size={15} className="ml-auto text-muted-foreground" /></Link>
                <Link href="/customer-care#payment" className="flex items-center gap-3 py-4"><ClipboardCheck size={18} className="shrink-0 text-primary" /><div><p className="text-sm font-semibold">Payment information</p><p className="mt-0.5 text-xs text-muted-foreground">Active methods appear during checkout.</p></div><ChevronRight size={15} className="ml-auto text-muted-foreground" /></Link>
              </div>

              <Link href="/shop" className="mt-5 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
                <ArrowLeft size={12} />
                Back to shop
              </Link>
            </motion.div>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1"><p className="price-display truncate text-xl">{selectedPrice > 0 ? formatPriceAED(lineItemUnitPrice * quantity) : "Price pending"}</p><p className="truncate text-xs text-muted-foreground">{selectedSize ? `Size ${selectedSize} · ${quantity} selected` : "Choose a size to continue"}</p></div>
          <button type="button" onClick={handleAddToCart} disabled={!selectedSize || !selectedKitData.variantId || selectedSizeStock < 1 || selectedPrice <= 0} className="inline-flex h-12 min-w-36 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">{added ? <Check size={16} /> : <ShoppingBag size={16} />}{added ? "Added" : selectedKitData.stock < 1 ? "Sold out" : selectedPrice <= 0 ? "Price pending" : !selectedSize ? "Select size" : "Add to bag"}</button>
        </div>
      </div>

      <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} availableSizes={selectedKitSizes} />

      <Footer />
    </div>
  );
}
