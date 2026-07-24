"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronDown, ChevronRight, ClipboardCheck, Minus, Plus, RotateCcw, ShoppingBag, Truck } from "lucide-react";
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
  const [selectedFontSlug, setSelectedFontSlug] = useState("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [openInfo, setOpenInfo] = useState<string | null>(null);

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
  const infoItems = [
    {
      id: "delivery",
      icon: Truck,
      title: "Delivery reviewed before fulfilment",
      summary: "Fee and timing are confirmed with the order.",
      content:
        "Delivery fees and the estimated arrival window are shown during checkout. Once the order is reviewed and dispatched, tracking information is shared with you.",
    },
    {
      id: "exchange",
      icon: RotateCcw,
      title: "Check exchange eligibility",
      summary: "Confirm the size before adding customization.",
      content:
        "Unused, uncustomized items can be reviewed for exchange. Jerseys with a printed name, number or arm badge may not be eligible, so please confirm your size first.",
    },
    {
      id: "payment",
      icon: ClipboardCheck,
      title: "Payment information",
      summary: "Active methods appear during checkout.",
      content:
        "Available payment methods are shown securely at checkout. The final total includes the selected kit, quantity and any name, number or badge customization.",
    },
  ];

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
    <div className="tisa-page-surface flex min-h-screen flex-col text-foreground">
      <Navbar />

      <main className="relative isolate flex-1 overflow-hidden pb-28 pt-24 sm:pt-28 lg:pb-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-48 top-28 -z-10 size-[34rem] rounded-full bg-[#ff001c]/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-[34rem] -z-10 size-[32rem] rounded-full bg-black/[0.055] blur-3xl"
        />
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6">
          {/* Breadcrumb */}
          <div className="mb-5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight size={10} />
            <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
            <ChevronRight size={10} />
            <span className="max-w-[220px] truncate text-foreground sm:max-w-none">{jersey.name}</span>
          </div>

          <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] lg:gap-8 xl:gap-12">
            {/* Left — Image Gallery */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="self-start lg:sticky lg:top-24"
            >
              <div
                className="relative overflow-hidden rounded-[28px] border border-black/[0.08] bg-white/65 shadow-[0_20px_60px_rgba(0,0,0,0.07)]"
                style={{
                  background: `radial-gradient(circle at 50% 42%, rgba(255,255,255,0.96) 0%, ${secondaryColor}18 48%, transparent 74%), linear-gradient(145deg, ${primaryColor}14, #efeeeb 48%, ${tertiaryColor}12)`,
                }}
              >
                <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-black/[0.07] bg-white/85 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] shadow-sm backdrop-blur">
                    {kitOptions.find((kit) => kit.id === selectedKit)?.label}
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                    {selectedKitData.stock} in stock
                  </span>
                </div>

                <div className="relative flex h-[430px] items-center justify-center p-4 sm:h-[540px] lg:h-[calc(100vh-250px)] lg:min-h-[540px] lg:max-h-[680px]">
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
                      <Image
                        src={getJerseyPreviewUrl(selectedFontSlug, customizationPreviewText, printColor)}
                        alt="Customization preview"
                        width={230}
                        height={140}
                        unoptimized
                        className="w-[190px] sm:w-[230px] translate-y-[-28px] mix-blend-multiply"
                        draggable={false}
                      />
                    </div>
                  )}
                </div>
                <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[76px] font-black uppercase tracking-[-0.08em] text-black/[0.025] sm:text-[105px]">
                  {jersey.team}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1 rounded-[18px] border border-black/[0.07] bg-white/70 p-1 shadow-sm">
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
                        className={`relative min-h-12 overflow-hidden rounded-[14px] px-2 py-1 text-sm font-semibold transition-colors ${
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
                            className="absolute inset-0 rounded-[14px] bg-primary"
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

              <div className="mt-2 flex gap-2">
                {["front", "back"].map((side) => (
                  <button
                    key={side}
                    onClick={() => setActiveImage(side)}
                    className={`min-h-10 flex-1 rounded-[14px] border text-sm font-semibold capitalize transition-all ${
                      activeImage === side
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {side} view
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Right — Purchase configuration */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="flex flex-col rounded-[28px] border border-white/90 bg-white/85 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.075)] backdrop-blur-xl sm:p-7"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                  {jersey.league}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {jersey.collection}
                </span>
              </div>
              <h1 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.045em] sm:text-5xl">
                {jersey.name}
              </h1>
              <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                {jersey.description}
              </p>

              <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-b border-black/[0.08] pb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Your total</p>
                  <span className="price-display mt-1 block text-4xl">{selectedPrice > 0 ? formatPriceAED(lineItemUnitPrice) : "Price pending"}</span>
                </div>
                {selectedSize && selectedSizeStock > 0 && selectedSizeStock <= 3 && <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Only {selectedSizeStock} left in {selectedSize}</span>}
              </div>

              <div className="pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                    <span className="text-xs font-black text-primary">01</span>
                    Select your size
                  </h3>
                  <button type="button" onClick={() => setSizeGuideOpen(true)} className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-primary">Size guide</button>
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
                      className={`h-11 rounded-xl border text-base font-semibold transition-all ${
                        selectedSize === size
                          ? "border-primary bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(225,7,20,0.16)]"
                          : "border-black/10 bg-white hover:border-primary/50 hover:text-primary"
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

                <div className="mt-6 border-t border-black/[0.08] pt-5">
                  <div><h3 className="flex items-center gap-2 text-base font-bold"><span className="text-xs font-black text-primary">02</span>Name & number</h3><p className="mt-1 text-sm text-muted-foreground">Optional · {formatPriceAED(prices.customization)} total when either field is used</p></div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Shirt name
                    <input
                      value={customName}
                      onChange={(event) => setCustomName(event.target.value.slice(0, 12).toUpperCase())}
                      placeholder="MESSI"
                      className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm uppercase tracking-normal text-foreground outline-none transition-colors focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Number
                    <input
                      value={customNumber}
                      onChange={(event) => setCustomNumber(event.target.value.replace(/\D/g, "").slice(0, 2))}
                      inputMode="numeric"
                      placeholder="10"
                      className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm tracking-normal text-foreground outline-none transition-colors focus:border-primary"
                    />
                  </label>
                </div>

                <div className="mt-4">
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Arm badge <span className="normal-case tracking-normal">(optional)</span>
                    <select
                      value={selectedBadge}
                      onChange={(event) => setSelectedBadge(event.target.value)}
                      className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                    >
                      <option value="">No badge</option>
                      <option value="ucl">UCL Badge (+{formatPriceAED(prices.armBadge)})</option>
                      <option value="epl">EPL Badge (+{formatPriceAED(prices.armBadge)})</option>
                    </select>
                  </label>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-base font-semibold">Quantity</span>
                  <div className="flex items-center rounded-xl border border-black/10 bg-white p-1">
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
                  className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground shadow-[0_14px_30px_rgba(225,7,20,0.2)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_18px_36px_rgba(225,7,20,0.27)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {added ? <Check size={15} /> : <ShoppingBag size={15} />}
                  {added ? "Added to bag" : selectedKitData.stock < 1 ? "Sold out" : selectedPrice <= 0 ? "Price pending" : !selectedSize ? "Select a size" : `Add to bag · ${formatPriceAED(lineItemUnitPrice * quantity)}`}
                </button>
                <Link
                  href="/cart"
                  aria-label="View bag"
                  className="flex size-13 items-center justify-center rounded-2xl border border-black/10 bg-white hover:border-primary hover:text-primary"
                >
                  <ShoppingBag size={16} />
                </Link>
              </div>

              <div className="mt-5 divide-y divide-black/[0.08] overflow-hidden rounded-2xl border border-black/[0.08] bg-black/[0.018] px-4">
                {infoItems.map((item) => {
                  const Icon = item.icon;
                  const isOpen = openInfo === item.id;
                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`product-info-${item.id}`}
                        onClick={() => setOpenInfo((current) => current === item.id ? null : item.id)}
                        className="group flex w-full items-center gap-3 py-4 text-left"
                      >
                        <span className={`grid size-9 shrink-0 place-items-center rounded-xl transition-colors ${isOpen ? "bg-primary text-primary-foreground" : "bg-white text-primary shadow-sm"}`}>
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{item.title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.summary}</span>
                        </span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180 text-primary" : "group-hover:text-primary"}`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            id={`product-info-${item.id}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="pb-4 pl-12 pr-2 text-sm leading-6 text-muted-foreground">
                              {item.content}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <Link href="/shop" className="mt-5 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
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
