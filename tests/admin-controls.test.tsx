// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchSelectField from "@/components/admin/SearchSelectField";
import AdminNavigation from "@/components/admin/AdminNavigation";
import AdminDialog from "@/components/admin/AdminDialog";
import { ProductEditor, createEmptyProductForm } from "@/app/pages/AdminDashboard";
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/products", useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/lib/supabase/config", () => ({ supabaseUrl: "https://example.supabase.co" }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
afterEach(cleanup);
const options = [{ id: "pl", label: "Premier League" }, { id: "ll", label: "La Liga", searchText: "Spain" }];
function SelectHarness() {
  const [value, setValue] = useState("pl");
  return <><SearchSelectField label="League" options={options} value={value} onChange={setValue} /><output aria-label="Selected league">{value}</output></>;
}
describe("admin dropdowns", () => {
  it("keeps a valid selection while searching and commits the chosen result", async () => {
    render(<SelectHarness />);
    const input = screen.getByRole<HTMLInputElement>("combobox", { name: "League" });
    act(() => input.focus());
    fireEvent.input(input, { target: { value: "Spa" }, inputType: "insertText", data: "a" });
    expect(screen.getByLabelText("Selected league").textContent).toBe("pl");
    const option = await screen.findByRole("option", { name: "La Liga" });
    fireEvent.click(option);
    await waitFor(() => expect(screen.getByLabelText("Selected league").textContent).toBe("ll"));
    expect(input.value).toBe("La Liga");
  });
  it("supports opening, keyboard selection and explicit clearing", async () => {
    render(<SelectHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Open League options" }));
    expect(await screen.findByRole("option", { name: "Premier League" })).toBeTruthy();
    const input = screen.getByRole("combobox", { name: "League" });
    fireEvent.input(input, { target: { value: "La Liga" }, inputType: "insertText", data: "a" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.getByLabelText("Selected league").textContent).toBe("ll"));
    fireEvent.click(screen.getByRole("button", { name: "Clear League" }));
    expect(screen.getByLabelText("Selected league").textContent).toBe("");
  });
  it("opens and closes Settings navigation and dismisses it with Escape", () => {
    render(<AdminNavigation />);
    const settings = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(settings);
    expect(settings.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(settings);
    expect(settings.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(settings);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(settings.getAttribute("aria-expanded")).toBe("false");
  });
  it("explains the disabled team dependency", () => {
    render(<SearchSelectField label="Team" value="" options={[]} onChange={vi.fn()} disabled hint="Choose a league first." />);
    expect(screen.getByRole<HTMLInputElement>("combobox", { name: "Team" }).disabled).toBe(true);
    expect(screen.getByText("Choose a league first.")).toBeTruthy();
  });
});
describe("admin editor state and dialogs", () => {
  it("updates a new product name and slug together and prevents duplicate saves", async () => {
    let complete: (() => void) | undefined;
    const save = vi.fn(() => new Promise<void>(resolve => { complete = resolve; }));
    function Editor() {
      const [form, setForm] = useState(createEmptyProductForm());
      return <ProductEditor form={form} onChange={setForm} onSave={save} onClose={vi.fn()} leagues={[]} teams={[]} seasons={[]} sizes={[]} />;
    }
    render(<Editor />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Arsenal Home" } });
    expect(screen.getByLabelText<HTMLInputElement>("Name").value).toBe("Arsenal Home");
    expect(screen.getByLabelText<HTMLInputElement>("Slug").value).toBe("arsenal-home");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Arsenal Away" } });
    expect(screen.getByLabelText<HTMLInputElement>("Slug").value).toBe("arsenal-away");
    fireEvent.click(screen.getByRole("button", { name: "Save Product" }));
    const saving = screen.getByRole<HTMLButtonElement>("button", { name: "Saving…" });
    expect(saving.disabled).toBe(true);
    fireEvent.click(saving);
    expect(save).toHaveBeenCalledTimes(1);
    complete?.();
    await waitFor(() => expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save Product" }).disabled).toBe(false));
  });
  it("closes an open combobox before closing its editor on Escape", async () => {
    const close = vi.fn();
    render(<AdminDialog label="Editor" onClose={close}><SearchSelectField label="League" options={options} value="pl" onChange={vi.fn()} /></AdminDialog>);
    const input = screen.getByRole("combobox", { name: "League" });
    fireEvent.click(screen.getByRole("button", { name: "Open League options" }));
    await screen.findByRole("option", { name: "Premier League" });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(close).not.toHaveBeenCalled();
    await waitFor(() => expect(input.getAttribute("aria-expanded")).toBe("false"));
    fireEvent.keyDown(input, { key: "Escape" });
    expect(close).toHaveBeenCalledOnce();
  });
  it("locks background scrolling, contains focus and closes on Escape", () => {
    const close = vi.fn();
    document.body.style.overflow = "auto";
    const { unmount } = render(<AdminDialog label="Test editor" onClose={close}><button>First</button><button>Last</button></AdminDialog>);
    expect(document.body.style.overflow).toBe("hidden");
    const last = screen.getByRole("button", { name: "Last" }); last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));
    fireEvent.keyDown(document, { key: "Escape" }); expect(close).toHaveBeenCalledOnce();
    unmount(); expect(document.body.style.overflow).toBe("auto");
  });
});
