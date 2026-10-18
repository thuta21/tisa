// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import MarketingWorkspace from "@/components/admin/marketing/MarketingWorkspace";
import type { Draft, MarketingProduct } from "@/lib/marketing/types";
const product: MarketingProduct = {
  id: "p1",
  name: "Arsenal Test Jersey",
  slug: "arsenal",
  team: "Arsenal",
  league: "Premier League",
  season: "2026/27",
  sleeve: "short",
  images: [
    {
      id: "front",
      kit: "home",
      side: "front",
      label: "Home front",
      path: "p/front.jpg",
    },
    {
      id: "back",
      kit: "home",
      side: "back",
      label: "Home back",
      path: "p/back.jpg",
    },
  ],
};
let current: Draft;
let configured: boolean;
let calls: { path: string; body: Record<string, unknown> | undefined }[];
beforeEach(() => {
  calls = [];
  configured = false;
  current = {
    id: "draft1",
    product_id: "p1",
    snapshot: product,
    selected_images: ["front", "back"],
    tone: "showcase",
    caption: "မြန်မာ preview caption",
    revision: 1,
    status: "draft",
    archived: false,
    created_at: "2026-10-18",
    updated_at: "2026-10-18",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, options?: RequestInit) => {
      const path = String(input),
        body = options?.body ? JSON.parse(String(options.body)) : undefined;
      calls.push({ path, body });
      let data: unknown;
      if (path.endsWith("/products?offset=0")) data = { products: [product] };
      else if (path.endsWith("/drafts"))
        data = {
          drafts: [current],
          jobs: [],
          aiConfigured: configured,
          siteUrl: "",
        };
      else if (path.endsWith("/drafts/draft1/ai"))
        data = {
          variations: [
            "Sales option one",
            "Sales option two",
            "Sales option three",
          ],
        };
      else if (path.endsWith("/drafts/draft1") && body) {
        current = { ...current, ...body, revision: current.revision + 1 };
        data = { draft: current };
      } else
        data = {
          draft: current,
          assets: [],
          jobs: [],
          images: { "p/front.jpg": "/front.jpg", "p/back.jpg": "/back.jpg" },
        };
      return new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json" },
      });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Marketing Studio without OpenAI credentials", () => {
  it("offers three captions without saving, replacing text, or sending AI requests until an option is chosen", async () => {
    render(<MarketingWorkspace />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Arsenal Test Jersey/ }),
    );
    await screen.findByRole("heading", { name: "Arsenal Test Jersey" });
    fireEvent.click(
      screen.getByRole("button", { name: "2. Caption & design" }),
    );
    fireEvent.change(screen.getByLabelText("Burmese caption"), {
      target: { value: "Keep my own caption" },
    });
    const before = calls.length;
    fireEvent.click(
      screen.getByRole("button", { name: "Generate 3 captions · no AI" }),
    );
    expect(
      screen.getByRole("heading", { name: "Template caption options · no AI" }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: /Use option [123]/ }),
    ).toHaveLength(3);
    expect(
      (screen.getByLabelText("Burmese caption") as HTMLTextAreaElement).value,
    ).toBe("Keep my own caption");
    expect(calls).toHaveLength(before);
    fireEvent.click(screen.getByRole("button", { name: "Use option 2" }));
    expect(
      (screen.getByLabelText("Burmese caption") as HTMLTextAreaElement).value,
    ).toContain("WhatsApp သို့မဟုတ် ဖုန်း");
    expect(calls.some((call) => call.path.includes("/ai"))).toBe(false);
    expect(current.caption).toBe("မြန်မာ preview caption");
  });
  it("loads only marketing data and supports editing, review and ordered previews", async () => {
    render(<MarketingWorkspace />);
    await screen.findByRole("button", { name: /Arsenal Test Jersey/ });
    fireEvent.click(
      screen.getByRole("button", { name: /Arsenal Test Jersey/ }),
    );
    await screen.findByRole("heading", { name: "Arsenal Test Jersey" });
    fireEvent.click(
      screen.getByRole("button", { name: "Move image 2 earlier" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "2. Caption & design" }),
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Set up AI",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Set up AI" }));
    expect(
      screen.getByRole("heading", {
        name: "Connect OpenAI for caption generation",
      }),
    ).toBeTruthy();
    expect(screen.getAllByText("OPENAI_API_KEY").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Burmese caption"), {
      target: { value: "Updated preview caption" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText("Draft saved.");
    expect(current.selected_images).toEqual(["back", "front"]);
    expect(current.caption).toBe("Updated preview caption");
    fireEvent.click(screen.getByRole("button", { name: "Mark ready" }));
    await screen.findByText("Reviewed and ready to export.");
    fireEvent.click(
      screen.getByRole("button", { name: "3. Preview & export" }),
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Download video",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(
      calls.every((call) => call.path.startsWith("/api/admin/marketing/")),
    ).toBe(true);
    expect(calls.some((call) => call.path.includes("/ai"))).toBe(false);
  });
  it("saves unsaved changes before AI generation and keeps the caption until a suggestion is selected", async () => {
    configured = true;
    render(<MarketingWorkspace />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Arsenal Test Jersey/ }),
    );
    await screen.findByRole("heading", { name: "Arsenal Test Jersey" });
    fireEvent.click(
      screen.getByRole("button", { name: "2. Caption & design" }),
    );
    fireEvent.change(screen.getByLabelText("Burmese caption"), {
      target: { value: "My edited sales caption" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save & generate with AI" }),
    );
    await screen.findByText("Sales option one");
    expect(current.caption).toBe("My edited sales caption");
    expect(
      (screen.getByLabelText("Burmese caption") as HTMLTextAreaElement).value,
    ).toBe("My edited sales caption");
    const saveIndex = calls.findIndex(
      (call) => call.path.endsWith("/drafts/draft1") && call.body,
    );
    const aiIndex = calls.findIndex((call) => call.path.endsWith("/ai"));
    expect(saveIndex).toBeGreaterThan(-1);
    expect(aiIndex).toBeGreaterThan(saveIndex);
    expect(calls[aiIndex].body?.revision).toBe(current.revision);
    fireEvent.click(screen.getByRole("button", { name: "Use option 1" }));
    expect(
      (screen.getByLabelText("Burmese caption") as HTMLTextAreaElement).value,
    ).toBe("Sales option one");
  });
  it("shows a migration setup notice instead of breaking the admin workspace", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (input: string) =>
          new Response(
            JSON.stringify(
              String(input).includes("/products")
                ? { products: [] }
                : {
                    error: "Apply the Marketing Studio database migration.",
                    setupRequired: true,
                  },
            ),
            { status: String(input).includes("/products") ? 200 : 503 },
          ),
      ),
    );
    render(<MarketingWorkspace />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Marketing setup required" }),
      ).toBeTruthy(),
    );
  });
});
