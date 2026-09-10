import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { adminClient, apiError } from "@/lib/inventory/server";
import { teamLogoBucket } from "@/lib/team-logos";

export const runtime = "nodejs";

type LogoAsset = {
  storagePath: string;
  absolutePath: string;
};

async function findLogoAssets(directory: string, prefix = ""): Promise<LogoAsset[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const assets = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(directory, entry.name);
    const storagePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return findLogoAssets(absolutePath, storagePath);
    return entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name)
      ? [{ absolutePath, storagePath }]
      : [];
  }));
  return assets.flat();
}

function canonicalTeamSlug(value: string) {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const aliases: Record<string, string> = {
    "afc-bournemouth": "bournemouth",
    brighton: "brighton-and-hove-albion",
    "brighton-hove-albion": "brighton-and-hove-albion",
    "man-u": "manchester-united",
    "man-united": "manchester-united",
    mancity: "manchester-city",
    "man-city": "manchester-city",
    newcastle: "newcastle-united",
    nottingham: "nottingham-forest",
    spur: "tottenham-hotspur",
    spurs: "tottenham-hotspur",
    tottenham: "tottenham-hotspur",
  };
  return aliases[slug] ?? slug;
}

export async function POST(request: Request) {
  try {
    const db = await adminClient(request);
    const assetDirectory = path.join(process.cwd(), "public", "assets", "team-logos");
    const assets = (await findLogoAssets(assetDirectory)).sort((a, b) => a.storagePath.localeCompare(b.storagePath));
    const logoBySlug = new Map(
      assets.map((asset) => [canonicalTeamSlug(path.basename(asset.storagePath, path.extname(asset.storagePath))), asset]),
    );

    for (const asset of assets) {
      const content = await readFile(asset.absolutePath);
      const extension = path.extname(asset.storagePath).toLowerCase();
      const contentType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
      const { error } = await db.storage.from(teamLogoBucket).upload(asset.storagePath, content, {
        cacheControl: "31536000",
        contentType,
        upsert: true,
      });
      if (error) throw error;
    }

    const { data: teams, error: teamsError } = await db.from("teams").select("id,name,slug");
    if (teamsError) throw teamsError;

    const matched: string[] = [];
    const unmatched: string[] = [];
    for (const team of teams ?? []) {
      const asset = logoBySlug.get(canonicalTeamSlug(team.slug)) ?? logoBySlug.get(canonicalTeamSlug(team.name));
      if (!asset) {
        unmatched.push(team.name);
        continue;
      }
      const { error } = await db.from("teams").update({ logo_path: asset.storagePath }).eq("id", team.id);
      if (error) throw error;
      matched.push(team.name);
    }

    return Response.json({ uploaded: assets.length, matched, unmatched });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/bucket not found/i.test(message)) {
      return Response.json(
        { error: "The team-logos bucket is not installed. Run migration 20260910113000_team_logos.sql, then retry." },
        { status: 503 },
      );
    }
    return apiError(error);
  }
}
