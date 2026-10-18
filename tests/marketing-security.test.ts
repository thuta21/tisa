import { beforeEach, describe, it, expect, vi } from "vitest";
const { client, create } = vi.hoisted(() => {
  const client = { auth: { getUser: vi.fn() }, from: vi.fn() };
  return { client, create: vi.fn(async () => client) };
});
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: create,
}));
vi.mock("@/lib/supabase/config", () => ({
  supabaseUrl: "https://catalog.example.test",
}));
import { GET, POST } from "@/app/api/admin/marketing/[...path]/route";
import { POST as render } from "@/app/api/admin/marketing/drafts/[id]/render/route";
import { trustedSource } from "@/lib/marketing/server";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  vi.clearAllMocks();
  client.auth.getUser.mockResolvedValue({ data: { user: null } });
});
describe("marketing API access control", () => {
  it("rejects unauthenticated reads, AI, media previews and downloads", async () => {
    for (const path of [
      ["drafts"],
      ["drafts", id, "preview"],
      ["assets", id],
      ["products"],
    ]) {
      const response = await GET(
        new Request(`http://localhost/api/admin/marketing/${path.join("/")}`),
        { params: Promise.resolve({ path }) },
      );
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toContain("no-store");
    }
    const response = await POST(
      new Request("http://localhost/api/admin/marketing/drafts", {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ path: ["drafts", id, "ai"] }) },
    );
    expect(response.status).toBe(401);
    expect(client.from).not.toHaveBeenCalled();
  });
  it("rejects customer roles before reading catalog or drafts", async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id } } });
    const profile = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(async () => ({ data: { role: "customer" } })),
    };
    profile.select.mockReturnValue(profile);
    profile.eq.mockReturnValue(profile);
    client.from.mockReturnValue(profile);
    const response = await GET(
      new Request("http://localhost/api/admin/marketing/drafts"),
      { params: Promise.resolve({ path: ["drafts"] }) },
    );
    expect(response.status).toBe(403);
    expect(client.from.mock.calls).toEqual([["profiles"]]);
  });
  it("protects the dedicated renderer and forbids cross-origin mutations", async () => {
    expect(
      (
        await render(
          new Request(
            `http://localhost/api/admin/marketing/drafts/${id}/render`,
            { method: "POST", body: "{}" },
          ),
          { params: Promise.resolve({ id }) },
        )
      ).status,
    ).toBe(401);
    create.mockClear();
    const response = await POST(
      new Request("http://localhost/api/admin/marketing/drafts", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
        body: "{}",
      }),
      { params: Promise.resolve({ path: ["drafts"] }) },
    );
    expect(response.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });
});
describe("marketing source-image allowlist", () => {
  it("accepts only local raster assets or the configured product-images bucket", () => {
    expect(trustedSource("/assets/tisa-shirt.png")).toEqual({
      local: "/assets/tisa-shirt.png",
    });
    expect(trustedSource("teams/arsenal.jpg")).toEqual({
      key: "teams/arsenal.jpg",
    });
    expect(
      trustedSource(
        "https://catalog.example.test/storage/v1/object/public/product-images/arsenal.jpg",
      ),
    ).toEqual({ key: "arsenal.jpg" });
    for (const path of [
      "http://169.254.169.254/latest/meta-data",
      "https://other.example/image.jpg",
      "../secret",
      "https://catalog.example.test/storage/v1/object/public/payment-proofs/test.jpg",
      "/assets/../secret.png",
    ]) {
      expect(() => trustedSource(path)).toThrow();
    }
  });
});
