import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Draft, SourceImage } from "./types";

const dataUri = (bytes: Buffer, mime = "image/jpeg") =>
  `data:${mime};base64,${bytes.toString("base64")}`;
const visualText = (text: string) =>
  text
    .replace(/[^\x20-\x7e]/g, " ")
    .trim()
    .slice(0, 100);
export async function renderFrame(
  draft: Draft,
  image: SourceImage,
  bytes: Buffer,
  video = false,
) {
  const width = video ? 720 : 1080,
    height = video ? 1280 : 1350;
  const logo = await readFile(
    join(process.cwd(), "public/assets/tisa-logo.png"),
  );
  const response = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#f4f3f0",
          color: "#141414",
          padding: video ? 48 : 64,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* ImageResponse renders embedded bytes, never remote URLs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUri(logo, "image/png")}
              alt=""
              width={64}
              height={64}
              style={{ borderRadius: 14 }}
            />
            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: 7 }}>
              TISA
            </span>
          </div>
          <span style={{ fontSize: video ? 16 : 20, color: "#b50712" }}>
            COLLECTION PREVIEW
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 35,
            paddingBottom: 35,
            minHeight: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUri(bytes)}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: 28,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            borderTop: "2px solid #d5d3ce",
            paddingTop: 28,
          }}
        >
          <span style={{ fontSize: video ? 22 : 26, color: "#57534e" }}>
            {visualText(draft.snapshot.league)} ·{" "}
            {visualText(draft.snapshot.season)}
          </span>
          <span
            style={{
              fontSize: video ? 36 : 48,
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            {visualText(draft.snapshot.name) ||
              visualText(draft.snapshot.team) ||
              "Football jersey"}
          </span>
          <span style={{ fontSize: video ? 24 : 28 }}>
            {image.kit.toUpperCase()} KIT · {image.side.toUpperCase()} ·{" "}
            {draft.snapshot.sleeve === "long" ? "LONG SLEEVE" : "SHORT SLEEVE"}
          </span>
          <span
            style={{
              fontSize: video ? 18 : 22,
              color: "#57534e",
              marginTop: 8,
            }}
          >
            Find your team. Wear your colors.
          </span>
        </div>
      </div>
    ),
    { width, height },
  );
  return Buffer.from(await response.arrayBuffer());
}
