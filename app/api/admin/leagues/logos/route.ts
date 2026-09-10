import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { adminClient, apiError } from "@/lib/inventory/server";
import { leagueLogoBucket } from "@/lib/league-logos";

export const runtime = "nodejs";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  try {
    const db = await adminClient(request);
    const assetDirectory = path.join(process.cwd(), "public", "assets", "league-logos");
    const fileNames = (await readdir(assetDirectory))
      .filter((fileName) => /\.(png|jpe?g|webp)$/i.test(fileName))
      .sort((a, b) => a.localeCompare(b));
    const fileBySlug = new Map(fileNames.map((fileName) => [slugify(path.basename(fileName, path.extname(fileName))), fileName]));

    for (const fileName of fileNames) {
      const content = await readFile(path.join(assetDirectory, fileName));
      const extension = path.extname(fileName).toLowerCase();
      const contentType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
      const { error } = await db.storage.from(leagueLogoBucket).upload(fileName, content, {
        cacheControl: "31536000",
        contentType,
        upsert: true,
      });
      if (error) throw error;
    }

    const { data: leagues, error: leaguesError } = await db.from("leagues").select("id,name,slug");
    if (leaguesError) throw leaguesError;

    const matched: string[] = [];
    const unmatched: string[] = [];
    for (const league of leagues ?? []) {
      const fileName = fileBySlug.get(slugify(league.slug)) ?? fileBySlug.get(slugify(league.name));
      if (!fileName) {
        unmatched.push(league.name);
        continue;
      }
      const { error } = await db.from("leagues").update({ logo_path: fileName }).eq("id", league.id);
      if (error) throw error;
      matched.push(league.name);
    }

    return Response.json({ uploaded: fileNames.length, matched, unmatched });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/bucket not found/i.test(message)) {
      return Response.json(
        { error: "The league-logos bucket is not installed. Run migration 20260910120000_league_logos.sql, then retry." },
        { status: 503 },
      );
    }
    return apiError(error);
  }
}
