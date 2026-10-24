import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { claims, profile, cookies } = vi.hoisted(() => ({
  claims: vi.fn(), profile: vi.fn(), cookies: { current: null as null | { setAll: (values: {name:string;value:string;options?:Record<string,unknown>}[]) => void } },
}));
vi.mock("@/lib/supabase/config", () => ({ supabaseUrl: "https://example.supabase.co", supabasePublishableKey: "sb_publishable_test", supabaseCookieOptions: { secure: true, sameSite: "lax" } }));
vi.mock("@supabase/ssr", () => ({ createServerClient: (_url: string, _key: string, options: {cookies: typeof cookies.current}) => {
  cookies.current = options.cookies;
  const query = { select: () => query, eq: () => query, maybeSingle: profile };
  return { auth: { getClaims: claims }, from: () => query };
} }));
import { proxy } from "@/proxy";
beforeEach(() => { vi.clearAllMocks(); claims.mockResolvedValue({ data: { claims: { sub: "user" } }, error: null }); profile.mockResolvedValue({ data: { role: "admin" }, error: null }); });
describe("proxy session and header integrity", () => {
  it("forwards refreshed cookies to server rendering and redirected browsers", async () => {
    claims.mockImplementation(async () => { cookies.current!.setAll([{ name: "sb-session", value: "fresh", options: { secure: true, sameSite: "lax" } }]); return { data: { claims: { sub: "user" } }, error: null }; });
    const rendered = await proxy(new NextRequest("https://tisa.test/account", { headers: { cookie: "sb-session=stale" } }));
    expect(rendered.headers.get("x-middleware-request-cookie")).toContain("sb-session=fresh");
    expect(rendered.cookies.get("sb-session")?.value).toBe("fresh");
    const redirect = await proxy(new NextRequest("https://tisa.test/admin/login"));
    expect(redirect.status).toBe(307);
    expect(redirect.headers.get("location")).toBe("https://tisa.test/admin");
    expect(redirect.cookies.get("sb-session")?.value).toBe("fresh");
    expect(redirect.headers.get("cache-control")).toContain("no-store");
  });
  it("overwrites untrusted nonce headers and refuses customer admin access", async () => {
    profile.mockResolvedValue({ data: { role: null }, error: null });
    const response = await proxy(new NextRequest("https://tisa.test/admin/products", { headers: { "x-nonce": "attacker" } }));
    expect(response.headers.get("location")).toContain("/admin/login");
    expect(response.headers.get("content-security-policy")).not.toContain("nonce-attacker");
    expect(response.headers.get("content-security-policy")).toContain("nonce-");
  });
});
