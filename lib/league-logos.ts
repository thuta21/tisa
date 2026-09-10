import { supabaseUrl } from "@/lib/supabase/config";

export const leagueLogoBucket = "league-logos";

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
