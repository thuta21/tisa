import { getCatalogPreviewKit, isCatalogKitPreviewAvailable, type CatalogJersey } from "@/lib/products";
import { getJerseySleeve, sleeveOptions } from "@/lib/product-sleeves";
import { kitOptions, type KitVariant } from "@/lib/jerseys";

export type CatalogFilters = { q: string; league: string; team: string; season: string; sleeve: string; kit: string; sort: string };
export function readCatalogFilters(params: { get(name: string): string | null }): CatalogFilters {
  return {
    q: params.get("q") ?? "", league: params.get("league") ?? "", team: params.get("team") ?? "", season: params.get("season") ?? "",
    sleeve: sleeveOptions.some(o => o.id === params.get("sleeve")) ? params.get("sleeve")! : "",
    kit: kitOptions.some(o => o.id === params.get("kit")) ? params.get("kit")! : "",
    sort: ["name", "season"].includes(params.get("sort") ?? "") ? params.get("sort")! : "featured",
  };
}
export function filterCatalog(jerseys: CatalogJersey[], filters: CatalogFilters) {
  const words = filters.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const result = jerseys.filter(item => {
    const kitNames = kitOptions.filter(kit => isCatalogKitPreviewAvailable(item, kit.id)).map(kit => kit.label);
    const text = [item.name, item.team, item.league, item.season, item.collection, getJerseySleeve(item), "sleeve", ...kitNames].join(" ").toLowerCase();
    return (!filters.league || item.league === filters.league) && (!filters.team || item.team === filters.team)
      && (!filters.season || item.season === filters.season) && (!filters.sleeve || getJerseySleeve(item) === filters.sleeve)
      && (!filters.kit || isCatalogKitPreviewAvailable(item, filters.kit as KitVariant)) && words.every(word => text.includes(word));
  });
  if (filters.sort === "name") result.sort((a, b) => a.name.localeCompare(b.name));
  if (filters.sort === "season") result.sort((a, b) => b.season.localeCompare(a.season, undefined, { numeric: true }) || a.name.localeCompare(b.name));
  return result;
}
export function getCardImage(jersey: CatalogJersey, kit?: string) {
  const selected = getCatalogPreviewKit(jersey, kit as KitVariant);
  return selected ? jersey.kits[selected].image : jersey.image_front;
}
