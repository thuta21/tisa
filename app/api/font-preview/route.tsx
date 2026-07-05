import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fontExtensions = ["ttf", "otf", "woff"];

function sanitizeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
}

function sanitizePreviewText(value: string | null) {
  const text = (value || "CHAMPIONS 10").toUpperCase().replace(/[^\w\s.-]/g, "").trim();
  return (text || "CHAMPIONS 10").slice(0, 24);
}

async function readPrivateFont(slug: string) {
  const root = join(process.cwd(), "private", "fonts");

  for (const extension of fontExtensions) {
    const candidate = normalize(join(root, `${slug}.${extension}`));
    if (!candidate.startsWith(root)) continue;

    try {
      return await readFile(candidate);
    } catch {
      // Try the next supported format.
    }
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = sanitizeSlug(searchParams.get("font") || "");
  const text = sanitizePreviewText(searchParams.get("text"));
  const variant = searchParams.get("variant") === "jersey" ? "jersey" : "card";
  const color = searchParams.get("color")?.match(/^#[0-9a-fA-F]{6}$/) ? searchParams.get("color")! : "#111111";
  const background = searchParams.get("background")?.match(/^#[0-9a-fA-F]{6}$/)
    ? searchParams.get("background")!
    : variant === "jersey"
      ? "#f8fafc"
      : "#ffffff";

  const fontData = slug ? await readPrivateFont(slug) : null;
  const isJersey = variant === "jersey";
  const [name, number = ""] = text.split(/\s+(?=\d{1,2}$)/);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background,
          color,
          padding: isJersey ? 8 : 24,
        }}
      >
        {isJersey ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 0,
              fontFamily: fontData ? "PreviewFont" : "sans-serif",
              textTransform: "uppercase",
            }}
          >
            <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: 3, lineHeight: 1 }}>
              {name}
            </div>
            <div style={{ fontSize: 116, fontWeight: 900, letterSpacing: 0, lineHeight: 0.9 }}>
              {number || "10"}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              border: "1px solid rgba(15, 23, 42, 0.12)",
              borderRadius: 24,
              fontFamily: fontData ? "PreviewFont" : "sans-serif",
              fontSize: text.length > 16 ? 42 : 54,
              fontWeight: 900,
              letterSpacing: 2,
              textAlign: "center",
              textTransform: "uppercase",
            }}
          >
            {text}
          </div>
        )}
      </div>
    ),
    {
      width: isJersey ? 320 : 900,
      height: isJersey ? 260 : 300,
      fonts: fontData
        ? [
            {
              name: "PreviewFont",
              data: fontData,
              weight: 900,
              style: "normal",
            },
          ]
        : [],
      headers: {
        "Cache-Control": "private, max-age=60",
        "X-Robots-Tag": "noindex",
      },
    }
  );
}
