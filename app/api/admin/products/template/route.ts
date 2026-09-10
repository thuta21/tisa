import { adminClient, apiError } from "@/lib/inventory/server";
import { makeWorkbook } from "@/lib/inventory/workbook";
import { buildProductImportHeaders, productImportKits, productImportSleeves, productImportStatuses } from "@/lib/product-import";

export async function GET() {
  try {
    const db = await adminClient();
    const [leagues, teams, seasons, sizes] = await Promise.all([
      db.from("leagues").select("id,name").order("sort_order"),
      db.from("teams").select("id,name,league_id,leagues(name)").order("sort_order"),
      db.from("seasons").select("id,name").order("sort_order"),
      db.from("jersey_sizes").select("id,label").order("sort_order"),
    ]);
    for (const result of [leagues, teams, seasons, sizes]) if (result.error) throw result.error;

    const headers = buildProductImportHeaders();
    const blank = Object.fromEntries(headers.map((header) => [header, ""]));
    const reference = [
      ...(leagues.data ?? []).map((row) => ({ type: "league", value: row.name, related: "" })),
      ...(teams.data ?? []).map((row) => ({ type: "team", value: row.name, related: (row.leagues as unknown as { name?: string } | null)?.name ?? "" })),
      ...(seasons.data ?? []).map((row) => ({ type: "season", value: row.name, related: "" })),
      ...(sizes.data ?? []).map((row) => ({ type: "inventory_size", value: row.label, related: "Use in the separate inventory workbook" })),
      ...productImportSleeves.map((value) => ({ type: "sleeve", value, related: "Required" })),
      ...productImportKits.map((value) => ({ type: "kit", value, related: "Variant columns" })),
      ...productImportStatuses.map((value) => ({ type: "status", value, related: "Use draft until catalog data and images are complete" })),
    ];
    const bytes = makeWorkbook({
      Products: [blank],
      Reference: reference,
      Instructions: [
        { step: 1, instruction: "Import this Products sheet before importing inventory." },
        { step: 2, instruction: "Set sleeve to short or long. Long-sleeve and short-sleeve jerseys are separate products." },
        { step: 3, instruction: "Each product can contain Home, Away and Third variants with unique SKUs." },
        { step: 4, instruction: "Draft products may leave league, team and season blank with base_price 0. Complete those fields before changing status to active." },
        { step: 5, instruction: "Import quantities from the separate inventory workbook." },
      ],
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": "attachment; filename=\"TISA_Products_Import_Template.xlsx\"",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
