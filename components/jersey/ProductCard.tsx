import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import PreviewImage from "@/components/jersey/PreviewImage";
import type { CatalogJersey } from "@/lib/products";
import { getCardImage } from "@/lib/catalog-filters";
import { getJerseySleeve } from "@/lib/product-sleeves";

export default function ProductCard({ jersey, kit }: { jersey: CatalogJersey; kit?: string }) {
  const image = getCardImage(jersey, kit);
  return <Link href={`/jersey/${jersey.slug}`} className="group overflow-hidden rounded-[24px] border border-border bg-white/85 transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
    <div className="relative aspect-[4/3] bg-[#eeece7]"><PreviewImage key={image} src={image} alt={jersey.name} fill sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain p-6 transition-transform duration-300 group-hover:scale-[1.035] motion-reduce:transform-none" /></div>
    <div className="p-5"><p className="text-xs text-muted-foreground">{jersey.league}{jersey.season ? ` · ${jersey.season}` : ""}</p><h2 className="mt-2 text-xl font-semibold tracking-tight">{jersey.name}</h2><p className="mt-2 text-xs text-muted-foreground">{getJerseySleeve(jersey) === "long" ? "Long sleeve" : "Short sleeve"}</p><span className="mt-4 flex items-center justify-between text-sm font-medium text-primary">View jersey details <ArrowUpRight size={18} /></span></div>
  </Link>;
}
