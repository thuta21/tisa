import { adminClient, apiError } from "@/lib/inventory/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = await adminClient(request);
    const [runs, products, inventory, orders, proofs] = await Promise.all([
      db.from("commerce_rebuilds")
        .select("id,status,backup_sha256,source_counts,created_at,cleaned_at,restored_at")
        .order("created_at", { ascending: false })
        .limit(10),
      db.from("products").select("id", { count: "exact", head: true }),
      db.from("inventory").select("id", { count: "exact", head: true }),
      db.from("orders").select("id", { count: "exact", head: true }),
      db.from("payment_proofs").select("id", { count: "exact", head: true }),
    ]);
    for (const result of [runs, products, inventory, orders, proofs]) {
      if (result.error) throw result.error;
    }
    return Response.json({
      runs: runs.data ?? [],
      counts: {
        products: products.count ?? 0,
        inventory: inventory.count ?? 0,
        orders: orders.count ?? 0,
        paymentProofs: proofs.count ?? 0,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const db = await adminClient(request);
    const body = await request.json() as {
      action?: "prepare" | "clean" | "restore";
      id?: string;
      sha256?: string;
      confirmation?: string;
    };
    if (body.action === "prepare") {
      const { data, error } = await db.rpc("prepare_commerce_rebuild");
      if (error) throw error;
      return Response.json(data, { headers: { "Cache-Control": "no-store" } });
    }
    if (body.action === "clean") {
      if (body.confirmation !== "CLEAN TISA DATA" || !body.id || !body.sha256) {
        throw new Error("Type CLEAN TISA DATA and use the matching backup before cleaning.");
      }
      const { data, error } = await db.rpc("clean_commerce_data", {
        p_rebuild_id: body.id,
        p_backup_sha256: body.sha256,
      });
      if (error) throw error;
      return Response.json(data);
    }
    if (body.action === "restore" && body.id) {
      const { data, error } = await db.rpc("restore_rebuild_orders", { p_rebuild_id: body.id });
      if (error) throw error;
      return Response.json(data);
    }
    throw new Error("Unsupported rebuild action.");
  } catch (error) {
    return apiError(error);
  }
}

