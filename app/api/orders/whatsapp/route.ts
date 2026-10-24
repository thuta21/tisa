import { readJson, RequestError, assertSameOrigin } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { validateCustomerProfile } from "@/lib/customer-profile";
import { buildWhatsAppOrderUrl } from "@/lib/whatsapp";

export async function POST(request: Request) {
  const fail = (error: string, status = 400) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) } });
  try {
    assertSameOrigin(request);
    const db = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return fail("Please log in to order.", 401);
    const body = await readJson(request);
    const { variantId, size, quantity, customerName, customerPhone } = body;
    if (typeof variantId !== "string" || !/^[\da-f-]{36}$/i.test(variantId) || typeof size !== "string" || size.length > 30 ||
        typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || typeof customerName !== "string" || typeof customerPhone !== "string")
      return fail("Choose a valid kit, size, quantity and customer details.");
    const profileError = validateCustomerProfile(customerName, customerPhone);
    if (profileError) return fail(profileError);

    const { data: allowed, error: quotaError } = await db.rpc("consume_whatsapp_order_quota");
    if (quotaError) throw quotaError;
    if (!allowed) return fail("Too many order enquiries. Please try again in a minute.", 429);

    // Read authoritative catalog and stock again when the customer clicks Order Now.
    const { data: variant, error: variantError } = await db.from("product_variants")
      .select("id,kit,name,sku,price,available,products!inner(slug,name,status,sleeve),inventory(size,quantity,reserved,is_active)")
      .eq("id", variantId).eq("available", true).eq("products.status", "active").maybeSingle();
    if (variantError) throw variantError;
    if (!variant) return fail("This kit is no longer available. Please choose another.", 409);
    const stock = variant.inventory.find((row) => row.size === size && row.is_active !== false);
    if (!stock || stock.quantity - stock.reserved < quantity) return fail("This size or quantity is no longer in stock. Please refresh and choose again.", 409);

    const { data: contact, error: contactError } = await db.from("whatsapp_contacts")
      .select("phone,label").eq("is_available", true).order("sort_order").order("created_at").order("id").limit(1).maybeSingle();
    if (contactError) throw contactError;
    if (!contact) return fail("Our WhatsApp team is currently unavailable. Please try again later or use the Contact page.", 503);
    const { error: saveError } = await db.rpc("update_customer_profile", { p_display_name: customerName, p_phone: customerPhone });
    if (saveError) throw saveError;
    const product = variant.products as unknown as { slug: string; name: string; sleeve: string };
    const url = buildWhatsAppOrderUrl(contact.phone, {
      customerName: customerName.trim(), customerPhone: customerPhone.trim(), productName: product.name,
      productUrl: new URL(`/jersey/${product.slug}`, getSiteUrl() ?? request.url).href,
      kit: variant.name, sleeve: product.sleeve === "long" ? "Long sleeve" : "Short sleeve",
      size, quantity, unitPrice: variant.price, sku: variant.sku,
    });
    return Response.json({ url, contact: contact.label }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestError) return fail(error.message, error.status);
    console.error("WhatsApp order preparation failed", error instanceof Error ? error.message : "Database request failed");
    return fail("Unable to prepare your WhatsApp order. Please try again.", 500);
  }
}
