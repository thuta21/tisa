"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Ruler } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import SizeGuideModal from "@/components/jersey/SizeGuideModal";
import { kitOptions, type KitVariant } from "@/lib/jerseys";
import { getCatalogPreviewKit, isCatalogKitPreviewAvailable, type CatalogJersey } from "@/lib/products";
import { getJerseySleeve, sleeveOptions } from "@/lib/product-sleeves";

export default function JerseyDetail({ jersey, alternatives }: { jersey: CatalogJersey; alternatives: CatalogJersey[] }) {
  const kits = kitOptions.filter((kit) => isCatalogKitPreviewAvailable(jersey, kit.id));
  const [selectedKit, setSelectedKit] = useState<KitVariant | null>(getCatalogPreviewKit(jersey));
  const [side, setSide] = useState<"front" | "back">("front");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const closeSizeGuide = useCallback(() => setSizeGuideOpen(false), [setSizeGuideOpen]);
  const [failedImage, setFailedImage] = useState("");
  const activeKit = getCatalogPreviewKit(jersey, selectedKit);
  const kit = activeKit ? jersey.kits[activeKit] : null;
  const activeSide = side === "back" && kit?.imageBack ? "back" : "front";
  const image = (activeSide === "back" ? kit?.imageBack : kit?.image) ?? "/assets/jersey-placeholder.svg";
  const sleeve = getJerseySleeve(jersey);

  return (
    <div className="tisa-page-surface flex min-h-screen flex-col text-foreground">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 pb-16 pt-24 sm:pt-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Link href="/">Home</Link><ChevronRight size={12} /><Link href="/shop">Collection</Link><ChevronRight size={12} /><span aria-current="page" className="text-foreground">{jersey.name}</span></nav>
          <div className="grid gap-7 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-10">
            <div>
              <div className="relative aspect-square overflow-hidden rounded-[28px] border border-border bg-white/65"><Image key={image} src={failedImage === image ? "/assets/jersey-placeholder.svg" : image} alt={activeKit ? `${jersey.name}, ${activeKit} kit, ${activeSide} view` : `${jersey.name}, kit preview unavailable`} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-contain p-5 sm:p-8" onError={() => setFailedImage(image)} /></div>
              {kit && (
                <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Jersey view">
                  {(["front", "back"] as const).map((view) => {
                    const unavailable = view === "back" && !kit.imageBack;
                    return (
                      <button
                        key={view}
                        type="button"
                        disabled={unavailable}
                        aria-label={`${view} view${unavailable ? " — unavailable" : ""}`}
                        aria-pressed={activeSide === view}
                        onClick={() => !unavailable && setSide(view)}
                        className={`min-h-12 rounded-xl border text-sm font-medium capitalize disabled:cursor-not-allowed disabled:opacity-40 ${activeSide === view ? "border-primary bg-primary text-white" : "border-border bg-white/70"}`}
                      >
                        {view} view
                        {unavailable && <span className="ml-1 text-xs normal-case">— unavailable</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <section className="rounded-[28px] border border-border bg-white/85 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{jersey.league}</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{jersey.name}</h1>
              {jersey.description && <p className="mt-5 text-base leading-7 text-muted-foreground">{jersey.description}</p>}
              <dl className="mt-7 grid grid-cols-2 gap-5 border-y border-border py-5"><div><dt className="text-xs text-muted-foreground">Team</dt><dd className="mt-1 text-sm font-medium">{jersey.team}</dd></div>{jersey.season && <div><dt className="text-xs text-muted-foreground">Season</dt><dd className="mt-1 text-sm font-medium">{jersey.season}</dd></div>}<div><dt className="text-xs text-muted-foreground">Sleeve</dt><dd className="mt-1 text-sm font-medium">{sleeveOptions.find((option) => option.id === sleeve)?.label}</dd></div>{jersey.product.fabric && <div><dt className="text-xs text-muted-foreground">Fabric</dt><dd className="mt-1 text-sm font-medium">{jersey.product.fabric}</dd></div>}</dl>
              {kits.length > 0 ? <div className="mt-6"><h2 className="text-sm font-medium">Kit design</h2><div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Kit design">{kits.map((option) => <button key={option.id} type="button" aria-pressed={activeKit === option.id} onClick={() => { setSelectedKit(option.id); setSide("front"); }} className={`min-h-11 rounded-full border px-5 text-sm font-medium ${activeKit === option.id ? "border-primary bg-primary text-white" : "border-border bg-white hover:border-primary/40"}`}>{option.label}</button>)}</div></div> : <p className="mt-6 text-sm text-muted-foreground">Kit previews are currently unavailable.</p>}
              {alternatives.length > 1 && <div className="mt-6"><h2 className="text-sm font-medium">Sleeve styles</h2><div className="mt-3 flex flex-wrap gap-2">{alternatives.map((item) => <Link key={item.slug} href={`/jersey/${item.slug}`} aria-current={item.slug === jersey.slug ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-medium ${item.slug === jersey.slug ? "border-primary text-primary" : "border-border hover:border-primary/40"}`}>{sleeveOptions.find((option) => option.id === getJerseySleeve(item))?.label}</Link>)}</div></div>}
              <button type="button" onClick={() => setSizeGuideOpen(true)} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium hover:border-primary/40"><Ruler size={18} /> View size guide</button>
              <div className="mt-7 rounded-2xl bg-primary/5 p-5"><h2 className="text-sm font-semibold text-primary">Collection preview</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Online ordering is not open yet. Checkout, customization orders and payments will be available after launch.</p></div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
      <SizeGuideModal open={sizeGuideOpen} onClose={closeSizeGuide} />
    </div>
  );
}
