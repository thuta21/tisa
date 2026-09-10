import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildProductImportHeaders, parseProductImportFile, type ProductImportReference } from "@/lib/product-import";

const reference: ProductImportReference = {
  leagues: [{ id: "league", name: "La Liga" }],
  teams: [{ id: "team", name: "Real Madrid", league_id: "league", leagues: { name: "La Liga" } }],
  seasons: [{ id: "season", name: "2026/27" }],
  sizes: [{ id: "size", label: "S", sort_order: 1 }],
};

function workbookFile(sleeve: string, overrides: Record<string, string | number> = {}) {
  const headers = buildProductImportHeaders();
  const values: Record<string, string | number> = {
    product_name: "Real Madrid Long Sleeve Jersey",
    sleeve,
    league: "La Liga",
    team: "Real Madrid",
    season: "2026/27",
    base_price: 75,
    status: "active",
    home_available: "yes",
    home_name: "Real Madrid Home Long Sleeve",
    home_sku: "RM-H-LS-2627",
    home_price: 75,
    ...overrides,
  };
  const sheet = XLSX.utils.aoa_to_sheet([headers, headers.map((header) => values[header] ?? "")]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Products");
  const bytes = XLSX.write(book, { type: "array", bookType: "xlsx" });
  return new File([bytes], "products.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

describe("clean product import", () => {
  it("keeps stock out of the product template and requires explicit sleeve identity", async () => {
    const headers = buildProductImportHeaders();
    expect(headers).toContain("sleeve");
    expect(headers.some((header) => header.includes("_stock_"))).toBe(false);

    const valid = await parseProductImportFile(workbookFile("long"), reference, []);
    expect(valid.issues).toEqual([]);
    expect(valid.rows[0]).toMatchObject({ sleeve: "long", teamName: "Real Madrid" });

    const invalid = await parseProductImportFile(workbookFile(""), reference, []);
    expect(invalid.issues).toContainEqual(expect.objectContaining({ field: "sleeve" }));

    const incompleteDraft = await parseProductImportFile(workbookFile("short", {
      status: "draft",
      league: "",
      team: "",
      season: "",
      base_price: 0,
      home_available: "no",
      home_price: 0,
    }), reference, []);
    expect(incompleteDraft.issues).toEqual([]);
    expect(incompleteDraft.rows[0]).toMatchObject({ status: "draft", basePrice: 0 });
  });
});
