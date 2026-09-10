import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260813170000_secure_transactional_checkout.sql"),
  "utf8",
);

describe("secure checkout migration safety", () => {
  it("contains no row or table deletion statements", () => {
    expect(migration).not.toMatch(/\bdelete\s+from\b/i);
    expect(migration).not.toMatch(/\btruncate\b/i);
    expect(migration).not.toMatch(/\bdrop\s+table\b/i);
    expect(migration).not.toMatch(/\balter\s+table[\s\S]*?\bdrop\s+column\b/i);
  });

  it("moves customer checkout into the transactional function", () => {
    expect(migration).toContain("create or replace function public.create_checkout_order");
    expect(migration).toContain('drop policy if exists "Customers create checkout order items"');
    expect(migration).toContain("grant execute on function public.create_checkout_order");
  });
});
