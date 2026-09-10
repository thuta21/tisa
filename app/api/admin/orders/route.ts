import { adminClient, apiError } from "@/lib/inventory/server";

export async function POST(request: Request) {
  try {
    const db = await adminClient(request);
    const body = await request.json();
    let call;
    if (body.action === "save") call = db.rpc("save_admin_order", { p_order: body.order, p_items: body.items });
    else if (body.action === "status") call = db.rpc("update_admin_order_status", { p_order_id: body.orderId, p_status: body.status, p_note: body.note });
    else if (body.action === "delivery") call = db.rpc("update_admin_delivery_status", { p_order_id: body.orderId, p_status: body.status });
    else if (body.action === "payment") call = db.rpc("review_payment_proof", { p_proof_id: body.proofId, p_status: body.status, p_reason: body.reason });
    else if (body.action === "delete") call = db.rpc("delete_admin_order", { p_order_id: body.orderId });
    else throw new Error("Unsupported order action.");
    const { data, error } = await call;
    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return apiError(error);
  }
}

