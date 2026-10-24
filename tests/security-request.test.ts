import { describe, expect, it, vi } from "vitest";
import { assertSameOrigin, readJson, RequestError } from "@/lib/security/request";
import { validatePublicSupabaseConfig } from "@/lib/security/config";
import { contentSecurityPolicy } from "@/lib/security/csp";
import { apiError } from "@/lib/inventory/server";
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
const make = (body: string, headers: Record<string, string> = {}) => new Request("https://tisa.test/api/admin/products", { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
describe("API request boundaries", () => {
  it("requires same-origin browser mutations", () => {
    expect(() => assertSameOrigin(make("{}"))).toThrow("Forbidden origin");
    expect(() => assertSameOrigin(make("{}", { origin: "https://evil.test" }))).toThrow();
    expect(() => assertSameOrigin(make("{}", { origin: "https://tisa.test", "sec-fetch-site": "cross-site" }))).toThrow();
    expect(() => assertSameOrigin(make("{}", { origin: "https://tisa.test" }))).not.toThrow();
  });
  it("bounds actual bytes without relying on Content-Length", async () => {
    await expect(readJson(make('{"payload":"' + "x".repeat(100) + '"}'), 32)).rejects.toMatchObject({ status: 413 });
    await expect(readJson(make("{}", { "content-length": "999" }), 32)).rejects.toMatchObject({ status: 413 });
    await expect(readJson(make('[]'))).rejects.toThrow("JSON object");
    await expect(readJson(make('{broken'))).rejects.toThrow("valid JSON");
    await expect(readJson(make('{}', { "content-type": "text/plain" }))).rejects.toMatchObject({ status: 415 });
    await expect(readJson(make('{"name":"TISA"}'))).resolves.toEqual({ name: "TISA" });
  });
  it("does not cache errors or disclose database constraint details", async () => {
    const response = apiError({ code: "23505", message: "duplicate key: customer private email" });
    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(JSON.stringify(await response.json())).not.toContain("private email");
    expect(apiError(new RequestError("Too large", 413)).status).toBe(413);
  });
});
describe("browser security configuration", () => {
  it("rejects service-role keys and non-TLS external database origins", () => {
    const jwt = (role: string) => `x.${btoa(JSON.stringify({ role }))}.x`;
    expect(() => validatePublicSupabaseConfig("https://db.supabase.co", jwt("service_role"))).toThrow("Never expose");
    expect(() => validatePublicSupabaseConfig("https://db.supabase.co", "sb_secret_hidden")).toThrow();
    expect(() => validatePublicSupabaseConfig("http://db.supabase.co", "sb_publishable_safe")).toThrow("HTTPS");
    expect(() => validatePublicSupabaseConfig("http://127.0.0.1:54321", "sb_publishable_safe")).not.toThrow();
    expect(() => validatePublicSupabaseConfig("https://db.supabase.co", jwt("anon"))).not.toThrow();
  });
  it("requires a nonce for production scripts and limits Supabase origins", () => {
    const csp = contentSecurityPolicy("test-nonce", "https://db.supabase.co", false);
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp.split(";").find(rule => rule.includes("script-src"))).not.toContain("unsafe-inline");
    expect(csp).not.toContain("*.supabase.co");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
