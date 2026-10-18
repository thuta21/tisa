import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import ffmpeg from "ffmpeg-static";
export async function renderVideo(frames: Buffer[]) {
  if (frames.length < 2 || frames.length > 4)
    throw new Error("Slideshow needs 2–4 different product images.");
  if (!ffmpeg)
    throw new Error("Video renderer is not available on this server.");
  const directory = await mkdtemp(join(tmpdir(), "tisa-marketing-"));
  try {
    const seconds = Math.max(9, frames.length * 3);
    const entries: string[] = [];
    for (let i = 0; i < frames.length; i++) {
      await writeFile(join(directory, `scene-${i}.png`), frames[i]);
      entries.push(
        `file 'scene-${i}.png'\nduration ${seconds / frames.length}`,
      );
    }
    entries.push(`file 'scene-${frames.length - 1}.png'`);
    await writeFile(join(directory, "frames.txt"), entries.join("\n"));
    const output = join(directory, "slideshow.mp4");
    await new Promise<void>((resolve, reject) =>
      execFile(
        ffmpeg!,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-f",
          "concat",
          "-safe",
          "1",
          "-i",
          join(directory, "frames.txt"),
          "-vf",
          "fps=24,tpad=stop_mode=clone:stop_duration=1",
          "-t",
          String(seconds),
          "-r",
          "24",
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "23",
          "-pix_fmt",
          "yuv420p",
          "-threads",
          "1",
          "-movflags",
          "+faststart",
          output,
        ],
        { timeout: 240_000, maxBuffer: 1024 * 1024 },
        (error) =>
          error
            ? reject(
                new Error("Video rendering failed or timed out. Please retry."),
              )
            : resolve(),
      ),
    );
    const bytes = await readFile(output);
    if (bytes.length > 50 * 1024 * 1024)
      throw new Error("Rendered video exceeds the 50 MB export limit.");
    return bytes;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
