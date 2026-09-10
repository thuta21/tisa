import { createHash } from "node:crypto";
import { adminClient, apiError } from "@/lib/inventory/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = await adminClient(request);
    const { data, error } = await db.rpc("export_order_records");
    if (error) throw error;

    const body = JSON.stringify(data, null, 2);
    const checksum = createHash("sha256").update(body).digest("hex");
    const date = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");

    return new Response(body, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Disposition": `attachment; filename="TISA_Order_Records_Backup_${date}.json"`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-TISA-SHA256": checksum,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

