import { describe, expect, it } from "vitest";
import { getSafeAdminRedirectPath, getSafeRedirectPath } from "@/lib/auth/redirect";
import { getPasswordValidationError } from "@/lib/auth/password";

describe("safe auth redirects", () => {
  it("keeps valid same-origin paths", () => {
    expect(getSafeRedirectPath("/account?tab=orders")).toBe("/account?tab=orders");
    expect(getSafeAdminRedirectPath("/admin?view=orders")).toBe("/admin?view=orders");
  });

  it("rejects protocol-relative and backslash redirects", () => {
    expect(getSafeRedirectPath("//evil.example")).toBe("/");
    expect(getSafeRedirectPath("/\\evil.example")).toBe("/");
    expect(getSafeAdminRedirectPath("/account")).toBe("/admin");
  });
});

describe("password validation", () => {
  it("enforces the same minimum for registration and recovery", () => {
    expect(getPasswordValidationError("short")).toContain("8");
    expect(getPasswordValidationError("long-enough")).toBeNull();
  });
});
