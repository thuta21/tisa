import { adminClient, apiError, catalog } from "@/lib/inventory/server";
import { makeWorkbook } from "@/lib/inventory/workbook";

export async function GET() {
  try {
    const db = await adminClient();
    const [products, sizes] = await Promise.all([
      catalog(db),
      db.from("jersey_sizes").select("label").order("sort_order"),
    ]);
    if (sizes.error) throw sizes.error;
    const rows = products.flatMap((product) => product.product_variants.flatMap((variant) =>
      (sizes.data ?? []).map(({ label }) => {
        const current = variant.inventory.find((stock) => stock.size === label);
        return {
          product_id: product.id,
          variant_id: variant.id,
          sku: variant.sku ?? "",
          product_name: product.name,
          item_name: variant.name,
          sleeve: product.sleeve,
          kit: variant.kit,
          size: label,
          quantity: "",
          version: current?.version ?? 0,
        };
      })));
    const bytes = makeWorkbook({
      Inventory: rows.length ? rows : [{ product_id: "", variant_id: "", sku: "", product_name: "", item_name: "", sleeve: "", kit: "", size: "", quantity: "", version: 0 }],
      Instructions: [
        { step: 1, instruction: "Import products first, then download this template so stable product and variant IDs are included." },
        { step: 2, instruction: "Enter a nonnegative whole number in quantity for every size that should change." },
        { step: 3, instruction: "Blank quantity leaves the row unchanged; explicit 0 sets the balance to zero." },
        { step: 4, instruction: "Reserved and available values are never imported." },
      ],
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": "attachment; filename=\"TISA_Inventory_Import_Template.xlsx\"",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
