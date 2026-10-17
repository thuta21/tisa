import { beforeEach, describe, expect, it, vi } from "vitest";
const { query, db } = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), maybeSingle: vi.fn() };
  return { query, db: { from: vi.fn(() => query) } };
});
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn(async () => db) }));
vi.mock("@/lib/supabase/config", () => ({ supabaseUrl: "https://catalog.example.test" }));
import { getPreviewProduct, previewProductSelect } from "@/lib/catalog-server";

beforeEach(() => {
  vi.clearAllMocks();
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data: null, error: null });
});
describe("public preview product lookups", () => {
  it("fetches the requested active slug without reading the entire catalog", async () => {
    expect(await getPreviewProduct("arsenal-short")).toBeNull();
    expect(query.eq.mock.calls).toEqual([["status", "active"], ["slug", "arsenal-short"]]);
    expect(query.maybeSingle).toHaveBeenCalledOnce();
  });
  it("supports existing UUID product links", async () => {
    const id = "12345678-1234-1234-1234-123456789abc";
    await getPreviewProduct(id);
    expect(query.eq).toHaveBeenCalledWith("id", id);
  });
  it("surfaces database failures instead of returning a missing product", async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    await expect(getPreviewProduct("arsenal")).rejects.toThrow("could not be loaded");
  });
  it("does not fetch private operational or purchasing fields for previews", () => {
    expect(previewProductSelect).not.toContain("*");
    expect(previewProductSelect).not.toMatch(/inventory|price|quantity|reserved/);
  });
});
