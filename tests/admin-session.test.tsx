// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { auth, router } = vi.hoisted(() => ({ auth: { user: { id: "admin" } as {id:string}|null, isLoadingAuth: false }, router: { replace: vi.fn(), refresh: vi.fn() } }));
vi.mock("@/lib/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
import AdminSessionBoundary from "@/components/admin/AdminSessionBoundary";
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); auth.user = {id:"admin"}; auth.isLoadingAuth = false; });
describe("admin cached UI session boundary", () => {
  it("hides already-loaded admin data immediately on logout or account change", () => {
    const {rerender} = render(<AdminSessionBoundary adminId="admin"><p>Private order data</p></AdminSessionBoundary>);
    expect(screen.getByText("Private order data")).toBeTruthy();
    auth.user = {id:"customer"};
    rerender(<AdminSessionBoundary adminId="admin"><p>Private order data</p></AdminSessionBoundary>);
    expect(screen.queryByText("Private order data")).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/admin/login");
    expect(router.refresh).toHaveBeenCalledOnce();
  });
  it("does not display admin data or redirect until initial authentication finishes", () => {
    auth.user = null; auth.isLoadingAuth = true;
    render(<AdminSessionBoundary adminId="admin"><p>Private order data</p></AdminSessionBoundary>);
    expect(screen.queryByText("Private order data")).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
