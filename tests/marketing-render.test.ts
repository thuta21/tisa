import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { readFile, mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import ffmpeg from "ffmpeg-static";
import { renderFrame } from "@/lib/marketing/frame";
import { renderVideo } from "@/lib/marketing/video";
import type { Draft } from "@/lib/marketing/types";
const draft = {
  id: "test",
  snapshot: {
    id: "test",
    name: "Arsenal 2026/27 Player Version",
    team: "Arsenal",
    league: "Premier League",
    season: "2026/27",
    sleeve: "short",
    slug: "arsenal",
    images: [
      {
        id: "front",
        kit: "home",
        side: "front",
        path: "test",
        label: "Home front",
      },
    ],
  },
  selected_images: ["front"],
} as Draft;
describe("real marketing media exports", () => {
  it("renders a 1080×1350 PNG using embedded original images", async () => {
    const source = await sharp(await readFile("public/assets/tisa-shirt.png"))
      .flatten({ background: "#fafafa" })
      .jpeg()
      .toBuffer();
    const bytes = await renderFrame(draft, draft.snapshot.images[0], source);
    if(process.env.MARKETING_QA_DIR){await mkdir(process.env.MARKETING_QA_DIR,{recursive:true});await writeFile(join(process.env.MARKETING_QA_DIR,"poster.png"),bytes);}
    expect(await sharp(bytes).metadata()).toMatchObject({
      width: 1080,
      height: 1350,
      format: "png",
    });
  }, 30000);
  it("encodes the maximum four-scene export as a 12s 720p H264 MP4", async () => {
    const source = await sharp(await readFile("public/assets/tisa-shirt.png"))
      .resize(1200, 1200, { fit: "inside" })
      .jpeg()
      .toBuffer();
    const frame = await renderFrame(
      draft,
      draft.snapshot.images[0],
      source,
      true,
    );
    const video = await renderVideo([frame, frame, frame, frame]);
    if(process.env.MARKETING_QA_DIR){await mkdir(process.env.MARKETING_QA_DIR,{recursive:true});await writeFile(join(process.env.MARKETING_QA_DIR,"slideshow.mp4"),video);}
    const dir = await mkdtemp(join(tmpdir(), "marketing-test-"));
    try {
      const path = join(dir, "export.mp4");
      await writeFile(path, video);
      const log = await new Promise<string>((resolve, reject) =>
        execFile(
          ffmpeg!,
          ["-hide_banner", "-i", path, "-f", "null", "-"],
          { timeout: 30000 },
          (error, _out, stderr) => (error ? reject(error) : resolve(stderr)),
        ),
      );
      expect(log).toMatch(/Video: h264/);
      expect(log).toContain("720x1280");
      expect(log).toContain("yuv420p");
      expect(log).toContain("24 fps");
      expect(log).toContain("Duration: 00:00:12.00");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 120000);
  it("rejects invalid scene counts before starting FFmpeg", async () => {
    await expect(renderVideo([])).rejects.toThrow("2–4");
  });
});
