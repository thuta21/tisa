import type { CatalogJersey } from "@/lib/products";

export type SleeveType = "short" | "long";

export const sleeveOptions: { id: SleeveType; label: string }[] = [
  { id: "short", label: "Short Sleeve" },
  { id: "long", label: "Long Sleeve" },
];

export function getJerseySleeve(jersey: Pick<CatalogJersey, "product">): SleeveType {
  return jersey.product.sleeve === "long" ? "long" : "short";
}

/**
 * Sleeve choices are separate products because each one owns its own kit SKUs,
 * images and size-level inventory. League + team + season + collection is the
 * catalog family that links equivalent products without mixing player/fan lines.
 */
export function getCatalogFamilyKey(jersey: Pick<CatalogJersey, "team" | "league" | "season" | "collection" | "product">) {
  const team = jersey.product.teams?.id ?? jersey.team.trim().toLowerCase();
  const season = jersey.product.seasons?.id ?? jersey.season.trim().toLowerCase();
  const league = jersey.product.leagues?.id ?? jersey.league.trim().toLowerCase();
  const collection = jersey.collection.trim().toLowerCase();
  return `${league}:${team}:${season}:${collection}`;
}

export function getSleeveAlternatives(jerseys: CatalogJersey[], selected: CatalogJersey) {
  const familyKey = getCatalogFamilyKey(selected);
  return sleeveOptions
    .map((option) => jerseys.find((jersey) => (
      getCatalogFamilyKey(jersey) === familyKey && getJerseySleeve(jersey) === option.id
    )))
    .filter((jersey): jersey is CatalogJersey => Boolean(jersey));
}
