import { beforeEach, describe, expect, it, vi } from "vitest";
const { db, variantQuery, contactQuery, auth, saveProfile } = vi.hoisted(() => {
  function query() { return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn() }; }
  const variantQuery = query(), contactQuery = query();
  const auth = vi.fn(), saveProfile = vi.fn();
  return { variantQuery, contactQuery, auth, saveProfile, db: { auth: { getUser: auth }, rpc: saveProfile, from: vi.fn((table: string) => table === "product_variants" ? variantQuery : contactQuery) } };
});
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => db }));
import { POST } from "@/app/api/orders/whatsapp/route";
import { normalizeWhatsAppNumber, buildWhatsAppOrderUrl } from "@/lib/whatsapp";
import { validateCustomerProfile } from "@/lib/customer-profile";
const payload = { variantId: "00000000-0000-4000-8000-000000000001", size: "M", quantity: 2, customerName: "Aung Aung", customerPhone: "+971 50 123 4567" };
function request(body = payload, origin = "https://tisa.test") { return new Request("https://tisa.test/api/orders/whatsapp", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ data: { user: { id: "customer" } }, error: null });
  saveProfile.mockImplementation(async (name: string) => name === "consume_whatsapp_order_quota" ? { data: true, error: null } : { error: null });
  variantQuery.maybeSingle.mockResolvedValue({ data: { id: payload.variantId, name: "Home Player", kit: "home", sku: "ARS-H", price: 65, available: true, products: { slug: "arsenal", name: "Arsenal Jersey", sleeve: "long", status: "active" }, inventory: [{ size: "M", quantity: 4, reserved: 1, is_active: true }] }, error: null });
  contactQuery.maybeSingle.mockResolvedValue({ data: { label: "Sales", phone: "971501234567" }, error: null });
});
describe("WhatsApp order preparation", () => {
  it("requires a verified login and rejects other origins", async () => {
    expect((await POST(request(payload, "https://evil.test"))).status).toBe(403);
    auth.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request())).status).toBe(401);
    expect(db.from).not.toHaveBeenCalled();
  });
  it("rechecks stock and does not route unavailable quantities", async () => {
    const response = await POST(request({ ...payload, quantity: 4 }));
    expect(response.status).toBe(409);
    expect(saveProfile).not.toHaveBeenCalledWith("update_customer_profile", expect.anything());
  });
  it("reports no available team without falling back to another number", async () => {
    contactQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await POST(request())).status).toBe(503);
    expect(saveProfile).not.toHaveBeenCalledWith("update_customer_profile", expect.anything());
  });
  it("uses database prices and available contacts in deterministic priority order", async () => {
    const response = await POST(request({ ...payload, unitPrice: 1 } as typeof payload));
    expect(response.status).toBe(200);
    const { url } = await response.json();
    const target = new URL(url);
    expect(target.origin).toBe("https://wa.me");
    expect(target.pathname).toBe("/971501234567");
    expect(target.searchParams.get("text")).toContain("Product subtotal: AED 130.00");
    for (const text of ["Aung Aung", "+971 50 123 4567", "Arsenal Jersey", "Home Player", "Long sleeve", "Size: M", "Quantity: 2", "/jersey/arsenal"]) expect(target.searchParams.get("text")).toContain(text);
    expect(contactQuery.eq).toHaveBeenCalledWith("is_available", true);
    expect(contactQuery.order.mock.calls.map(call => call[0])).toEqual(["sort_order", "created_at", "id"]);
    expect(saveProfile).toHaveBeenCalledWith("update_customer_profile", { p_display_name: payload.customerName, p_phone: payload.customerPhone });
  });
  it("rejects missing customer details and fractional quantities", async () => {
    expect((await POST(request({ ...payload, customerName: "" }))).status).toBe(400);
    expect((await POST(request({ ...payload, quantity: 1.5 }))).status).toBe(400);
  });
});
describe("WhatsApp contact and message validation", () => {
  it("normalizes international numbers and rejects local or malformed values", () => {
    expect(normalizeWhatsAppNumber("+971 (50) 123-4567")).toBe("971501234567");
    for (const phone of ["0501234567", "123", "+971/50/1234567", "971501234567?text=bad"]) expect(() => normalizeWhatsAppNumber(phone)).toThrow();
  });
  it("preserves Burmese names without adding query parameters", () => {
    const url = buildWhatsAppOrderUrl("971501234567", { customerName: "မောင် & Aung", customerPhone: "+971501234567", productName: "Home & Away", productUrl: "https://tisa.test/jersey/arsenal", kit: "Home", sleeve: "Short", size: "M", quantity: 1, unitPrice: 65 });
    expect([...new URL(url).searchParams.keys()]).toEqual(["text"]);
    expect(new URL(url).searchParams.get("text")).toContain("မောင် & Aung");
    expect(validateCustomerProfile("Name\nInjected", "1234567")).toBeTruthy();
  });
});
