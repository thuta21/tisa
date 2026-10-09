import { supabaseUrl } from "@/lib/supabase/config";

export const leagueLogoBucket = "league-logos";

const defaultLeagueLogos: Record<string, string> = {
  bundesliga: "bundesliga.png",
  "ligue-1": "ligue-1.png",
  mls: "mls.png",
};

export function getDefaultLeagueLogo(nameOrSlug?: string | null) {
  const key = nameOrSlug?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const fileName = key ? defaultLeagueLogos[key] : null;
  return fileName ? `/assets/league-logos/${fileName}` : null;
}

export function getPublicLeagueLogo(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("/") || path.startsWith("http://") || path.startsWith("https://")) return path;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${leagueLogoBucket}/${encodedPath}`;
}

export function getBundledLeagueLogo(path?: string | null) {
  if (!path || path.startsWith("http://") || path.startsWith("https://")) return null;
  const normalizedPath = path.replace(/^\/+/, "");
  return normalizedPath.startsWith("assets/league-logos/")
    ? `/${normalizedPath}`
    : `/assets/league-logos/${normalizedPath}`;
}
